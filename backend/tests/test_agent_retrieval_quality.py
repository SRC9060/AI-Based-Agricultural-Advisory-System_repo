"""
Tests for AgriAdvisor Agent Knowledge-Retrieval Quality:
1. Crop-aware retrieval (Tomato vs Sugarcane/Groundnut ranking and exclusion).
2. Passage deduplication (preventing repeated overlapping chunks).
3. Redundant search reduction in AgentRunner (query similarity, cache reuse, search budgeting).
4. Source metadata preservation and chemical/pesticide dosage verification safety.
"""

import json
import unittest
from unittest.mock import MagicMock, patch

from langchain_core.documents import Document

from services import knowledge_base
from services.agent_llm import AgentLLMResponse, MockToolCallingClient, ToolCall
from services.agent_runner import AgentRunner, DEFAULT_AGENT_SYSTEM_PROMPT
from services.knowledge_base import (
    CROP_KEYWORD_MAP,
    KNOWN_CROP_FOLDERS,
    detect_crop,
    is_duplicate_passage,
    search_knowledge_base,
)
from services.tool_registry import (
    SearchKnowledgeBaseInput,
    create_default_agricultural_tool_registry,
    handle_search_knowledge_base,
)
from services.workflow_registry import get_default_workflow_registry


class TestCropAwareRetrieval(unittest.TestCase):
    """Test that crop-aware retrieval prioritizes target crop and general horticulture over unrelated crops."""

    def setUp(self):
        knowledge_base.KNOWLEDGE_BASE_READY.set()

    def tearDown(self):
        knowledge_base.KNOWLEDGE_BASE_READY.clear()

    def test_detect_crop_extraction(self):
        """detect_crop identifies target crop from query or explicit parameter."""
        self.assertEqual(detect_crop("my tomato leaves are yellowing"), "Tomato")
        self.assertEqual(detect_crop("wheat rust treatment"), "Wheat")
        self.assertEqual(detect_crop("rice blast control in paddy"), "Rice")
        self.assertEqual(detect_crop("yellowing leaves", explicit_crop="tomato"), "Tomato")
        self.assertEqual(detect_crop("yellowing leaves", explicit_crop="Tomato"), "Tomato")
        self.assertIsNone(detect_crop("general soil testing and drip irrigation"))

    def test_crop_aware_retrieval_excludes_unrelated_crops(self):
        """When searching for tomato yellowing, Tomato & Horticulture documents rank first and Sugarcane/Groundnut are excluded."""
        doc_tomato_1 = Document(
            page_content="Tomato leaf curl virus causes yellowing, curling, and stunting of tomato plants.",
            metadata={"folder": "Tomato", "filename": "Tomato_Guide.pdf", "page": 12},
        )
        doc_tomato_2 = Document(
            page_content="Nitrogen deficiency in tomato leads to uniform yellowing of older leaves.",
            metadata={"folder": "Tomato", "filename": "Tomato_Nutrients.pdf", "page": 5},
        )
        doc_horticulture = Document(
            page_content="Horticultural vegetable management: micronutrient sprays and whitefly vector control in solanaceous crops.",
            metadata={"folder": "Horticulture", "filename": "Vegetable_Care.pdf", "page": 22},
        )
        doc_diseases = Document(
            page_content="Whitefly Bemisia tabaci vector management and viral disease prevention in vegetable crops.",
            metadata={"folder": "Diseases", "filename": "Plant_Pathology.pdf", "page": 45},
        )
        doc_sugarcane = Document(
            page_content="Sugarcane yellow leaf disease is transmitted by sugarcane aphids in ratoon crops.",
            metadata={"folder": "Sugarcane", "filename": "Sugarcane_Production.pdf", "page": 30},
        )
        doc_groundnut = Document(
            page_content="Groundnut chlorosis occurs due to iron deficiency in calcareous black soils.",
            metadata={"folder": "Groundnut", "filename": "Groundnut_Guide.pdf", "page": 8},
        )

        mock_vdb = MagicMock()
        # General similarity returns a mix of tomato, horticulture, and unrelated sugarcane/groundnut
        mock_vdb.similarity_search_with_score.return_value = [
            (doc_sugarcane, 0.40),    # Unrelated crop with accidental semantic match
            (doc_tomato_1, 0.42),     # Target crop
            (doc_groundnut, 0.45),    # Unrelated crop
            (doc_horticulture, 0.48), # General horticulture guidance
            (doc_diseases, 0.50),     # General plant disease guidance
        ]
        # Crop-filtered search returns Tomato documents
        mock_vdb.similarity_search.return_value = [doc_tomato_1, doc_tomato_2]

        with patch.object(knowledge_base, "load_vector_database", return_value=mock_vdb):
            results = search_knowledge_base("tomato leaves turning yellow")

            # Check that results are returned
            self.assertTrue(len(results) >= 3)

            returned_folders = [d.metadata.get("folder") for d in results]
            # Unrelated crops (Sugarcane, Groundnut) must NOT appear when target crop is Tomato
            self.assertNotIn("Sugarcane", returned_folders, "Sugarcane documents must be excluded for tomato query")
            self.assertNotIn("Groundnut", returned_folders, "Groundnut documents must be excluded for tomato query")

            # Target crop documents must be present and ranked at top
            self.assertEqual(results[0].metadata.get("folder"), "Tomato")
            self.assertIn("Tomato", returned_folders)
            # General horticulture and disease references must be preserved
            self.assertTrue(any(f in ("Horticulture", "Diseases") for f in returned_folders))

    def test_explicit_crop_parameter_takes_precedence(self):
        """Explicit crop parameter directs crop-aware ranking even if query lacks crop keyword."""
        doc_tomato = Document(
            page_content="Tomato bacterial spot management with copper oxychloride.",
            metadata={"folder": "Tomato", "filename": "Tomato_Diseases.pdf"},
        )
        doc_wheat = Document(
            page_content="Wheat leaf spot management with propiconazole.",
            metadata={"folder": "Wheat", "filename": "Wheat_Diseases.pdf"},
        )

        mock_vdb = MagicMock()
        mock_vdb.similarity_search_with_score.return_value = [
            (doc_wheat, 0.35),
            (doc_tomato, 0.38),
        ]
        mock_vdb.similarity_search.return_value = [doc_tomato]

        with patch.object(knowledge_base, "load_vector_database", return_value=mock_vdb):
            results = search_knowledge_base("leaf spot spray management", crop="Tomato")
            self.assertTrue(len(results) >= 1)
            self.assertEqual(results[0].metadata.get("folder"), "Tomato")


class TestPassageDeduplication(unittest.TestCase):
    """Test deduplication of overlapping or near-identical text passages."""

    def test_exact_and_near_duplicate_detection(self):
        seen = [
            "Tomato yellow leaf curl virus is transmitted by whiteflies Bemisia tabaci in tropical regions.",
        ]
        # Identical text
        self.assertTrue(is_duplicate_passage(
            "Tomato yellow leaf curl virus is transmitted by whiteflies Bemisia tabaci in tropical regions.",
            seen,
        ))
        # High token overlap (>70%)
        self.assertTrue(is_duplicate_passage(
            "Tomato yellow leaf curl virus is transmitted by whitefly Bemisia tabaci in tropical regions.",
            seen,
        ))
        # Distinct passage
        self.assertFalse(is_duplicate_passage(
            "Early blight of tomato caused by Alternaria solani produces concentric rings on lower leaves.",
            seen,
        ))

    def test_search_knowledge_base_deduplicates_overlapping_chunks(self):
        """search_knowledge_base drops repeated overlapping chunks from the same document."""
        chunk1 = Document(
            page_content="Tomato yellow leaf curl virus is transmitted by whitefly Bemisia tabaci causing severe stunting.",
            metadata={"folder": "Tomato", "filename": "Tomato_Guide.pdf", "page": 10},
        )
        # chunk2 overlaps heavily with chunk1 (typical sliding window artifact)
        chunk2 = Document(
            page_content="Tomato yellow leaf curl virus is transmitted by whitefly Bemisia tabaci causing severe stunting and leaf curl.",
            metadata={"folder": "Tomato", "filename": "Tomato_Guide.pdf", "page": 10},
        )
        chunk3 = Document(
            page_content="Tomato blossom end rot is a physiological disorder caused by calcium deficiency and irregular watering.",
            metadata={"folder": "Tomato", "filename": "Tomato_Disorders.pdf", "page": 4},
        )

        mock_vdb = MagicMock()
        mock_vdb.similarity_search_with_score.return_value = [
            (chunk1, 0.3),
            (chunk2, 0.31),  # Near duplicate of chunk1
            (chunk3, 0.45),  # Distinct
        ]
        mock_vdb.similarity_search.return_value = [chunk1, chunk2]

        knowledge_base.KNOWLEDGE_BASE_READY.set()
        try:
            with patch.object(knowledge_base, "load_vector_database", return_value=mock_vdb):
                results = search_knowledge_base("tomato yellow leaf curl and blossom end rot")
                # Exactly 2 distinct documents should be returned, chunk2 should be skipped
                self.assertEqual(len(results), 2)
                contents = [r.page_content for r in results]
                self.assertIn(chunk1.page_content, contents)
                self.assertIn(chunk3.page_content, contents)
                self.assertNotIn(chunk2.page_content, contents)
        finally:
            knowledge_base.KNOWLEDGE_BASE_READY.clear()


class TestRedundantSearchPrevention(unittest.TestCase):
    """Test that AgentRunner prevents redundant/near-identical searches and reuses evidence."""

    def setUp(self):
        self.registry = create_default_agricultural_tool_registry()

    def test_query_normalization_and_similarity(self):
        q1 = AgentRunner._normalize_search_query("what are the causes of tomato leaf yellowing?")
        q2 = AgentRunner._normalize_search_query("tomato leaf yellowing causes")
        sim = AgentRunner._query_similarity(q1, q2)
        self.assertGreaterEqual(sim, 0.70, f"Queries '{q1}' and '{q2}' should have >= 70% similarity")

        # Distinct queries should have low similarity
        q3 = AgentRunner._normalize_search_query("drip irrigation subsidy karnataka")
        sim_distinct = AgentRunner._query_similarity(q1, q3)
        self.assertLess(sim_distinct, 0.30)

    def test_near_identical_searches_reused_without_redundant_execution(self):
        """When LLM calls near-identical searches in consecutive rounds, second call is cached."""
        # Mock tool registry execute
        mock_handler = MagicMock(return_value={
            "status": "success",
            "count": 1,
            "documents": [{"source": "Tomato.pdf", "folder": "Tomato", "content": "Sample content"}],
        })

        test_registry = create_default_agricultural_tool_registry()
        # Override handler
        test_registry._tools["search_agricultural_knowledge_base"].handler = mock_handler

        # Round 1: LLM calls search for "tomato leaf yellowing"
        # Round 2: LLM calls near-identical search for "causes of tomato leaf yellowing"
        # Round 3: LLM emits final text
        mock_llm = MockToolCallingClient(responses=[
            AgentLLMResponse(
                content=None,
                tool_calls=[ToolCall(
                    id="call_1",
                    name="search_agricultural_knowledge_base",
                    arguments=json.dumps({"query": "tomato leaf yellowing", "crop": "Tomato"}),
                )],
            ),
            AgentLLMResponse(
                content=None,
                tool_calls=[ToolCall(
                    id="call_2",
                    name="search_agricultural_knowledge_base",
                    arguments=json.dumps({"query": "causes of tomato leaf yellowing"}),
                )],
            ),
            AgentLLMResponse(
                content="Tomato leaf yellowing is typically caused by whitefly-transmitted virus or nitrogen deficiency.",
                tool_calls=None,
            ),
        ])

        runner = AgentRunner(tool_registry=test_registry, llm_client=mock_llm, max_rounds=5)
        result = runner.run("My tomato leaves are turning yellow")

        # Tool handler should be called exactly ONCE; second near-identical call was served from cache
        self.assertEqual(mock_handler.call_count, 1, "Redundant search should not execute tool handler a second time")
        self.assertEqual(result.status, "completed")
        self.assertEqual(len(result.tool_calls_executed), 2)

        # Audit trail records duplicate prevention
        second_call = result.tool_calls_executed[1]
        self.assertIn("duplicate_prevented", second_call["result_summary"])

    def test_user_query_crop_auto_propagation(self):
        """When user asks about tomato, crop='Tomato' is auto-injected if LLM omits crop argument."""
        mock_handler = MagicMock(return_value={
            "status": "success",
            "count": 1,
            "documents": [],
        })
        test_registry = create_default_agricultural_tool_registry()
        test_registry._tools["search_agricultural_knowledge_base"].handler = mock_handler

        mock_llm = MockToolCallingClient(responses=[
            AgentLLMResponse(
                content=None,
                tool_calls=[ToolCall(
                    id="call_1",
                    name="search_agricultural_knowledge_base",
                    # LLM omits crop parameter
                    arguments=json.dumps({"query": "yellow curl virus treatment"}),
                )],
            ),
            AgentLLMResponse(content="Final advice", tool_calls=None),
        ])

        runner = AgentRunner(tool_registry=test_registry, llm_client=mock_llm, max_rounds=3)
        runner.run("My tomato plants have yellow curled leaves")

        # Check that crop='Tomato' was propagated to handler
        mock_handler.assert_called_once()
        called_input = mock_handler.call_args[0][0]
        self.assertEqual(called_input.crop, "Tomato")


class TestSourceMetadataAndDosageSafety(unittest.TestCase):
    """Test source metadata preservation and chemical/pesticide dosage verification safety."""

    def setUp(self):
        knowledge_base.KNOWLEDGE_BASE_READY.set()

    def tearDown(self):
        knowledge_base.KNOWLEDGE_BASE_READY.clear()

    def test_handle_search_knowledge_base_preserves_metadata_and_dosage_guideline(self):
        """Tool handler returns source, folder, page, and explicit dosage safety guidelines."""
        doc = Document(
            page_content="For whitefly control in tomato, spray imidacloprid 17.8 SL at 0.3 ml per litre of water.",
            metadata={"source": "/data/Crops/Tomato/Tomato_Guide.pdf", "folder": "Tomato", "page": 14},
        )
        mock_vdb = MagicMock()
        mock_vdb.similarity_search_with_score.return_value = [(doc, 0.3)]
        mock_vdb.similarity_search.return_value = [doc]

        with patch.object(knowledge_base, "load_vector_database", return_value=mock_vdb):
            res = handle_search_knowledge_base(SearchKnowledgeBaseInput(
                query="tomato whitefly spray dosage",
                crop="Tomato",
            ))

            self.assertEqual(res["status"], "success")
            self.assertEqual(res["count"], 1)
            self.assertIn("documents", res)
            doc_res = res["documents"][0]
            self.assertEqual(doc_res["source"], "Tomato_Guide.pdf")
            self.assertEqual(doc_res["folder"], "Tomato")
            self.assertEqual(doc_res["page"], 15)  # 1-indexed (14 + 1)
            self.assertIn("imidacloprid 17.8 SL", doc_res["content"])

            # Explicit dosage safety guideline must be provided
            self.assertIn("dosage_safety_guideline", res)
            guideline = res["dosage_safety_guideline"].lower()
            self.assertIn("verified", guideline)
            self.assertIn("product label", guideline)

    def test_system_prompt_enforces_dosage_confirmation_rule(self):
        """DEFAULT_AGENT_SYSTEM_PROMPT and workflows require local confirmation for unverified dosages."""
        prompt = DEFAULT_AGENT_SYSTEM_PROMPT
        self.assertIn("CHEMICAL & PESTICIDE DOSAGE SAFETY", prompt)
        self.assertIn("product label", prompt.lower())
        self.assertIn("krishi vigyan kendra", prompt.lower())

        # Check workflow prompts
        wf_reg = get_default_workflow_registry()
        for wf_name in ("general_advisory", "crop_care"):
            wf = wf_reg.get_workflow(wf_name)
            self.assertIn("dosage", wf.system_prompt.lower())
            self.assertIn("product label", wf.system_prompt.lower())


if __name__ == "__main__":
    unittest.main()
