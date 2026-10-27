import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from services import knowledge_base
from services.knowledge_base import (
    PACKAGED_KNOWLEDGE_BASE_PATH,
    PROJECT_ROOT,
    get_effective_knowledge_base_path,
    initialize_knowledge_base,
    is_vector_database_ready,
    load_documents,
    rebuild_vector_database,
)


class TestKnowledgeBaseConfigurationAndSafety(unittest.TestCase):
    def setUp(self):
        knowledge_base.KNOWLEDGE_BASE_READY.clear()

    def tearDown(self):
        knowledge_base.KNOWLEDGE_BASE_READY.clear()

    def test_packaged_fallback_when_configured_path_missing(self):
        """Worker falls back to packaged documents if KNOWLEDGE_BASE_PATH does not exist."""
        non_existent = Path(tempfile.gettempdir()) / "non_existent_kb_dir_9999"
        with patch.object(knowledge_base, "KNOWLEDGE_BASE_PATH", non_existent):
            effective = get_effective_knowledge_base_path()
            self.assertEqual(effective, PACKAGED_KNOWLEDGE_BASE_PATH)

    def test_packaged_fallback_when_configured_path_empty(self):
        """Worker falls back to packaged documents if KNOWLEDGE_BASE_PATH exists but is empty."""
        temp_dir = tempfile.mkdtemp()
        try:
            with patch.object(knowledge_base, "KNOWLEDGE_BASE_PATH", Path(temp_dir)):
                effective = get_effective_knowledge_base_path()
                self.assertEqual(effective, PACKAGED_KNOWLEDGE_BASE_PATH)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_prefers_custom_path_when_populated(self):
        """Uses custom KNOWLEDGE_BASE_PATH if it contains documents."""
        temp_dir = tempfile.mkdtemp()
        try:
            dummy_pdf = Path(temp_dir) / "test_doc.pdf"
            dummy_pdf.write_bytes(b"%PDF-1.4 dummy")
            with patch.object(knowledge_base, "KNOWLEDGE_BASE_PATH", Path(temp_dir)):
                effective = get_effective_knowledge_base_path()
                self.assertEqual(effective, Path(temp_dir))
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_is_vector_database_ready_false_when_missing(self):
        """Readiness returns False if CHROMA_DB_PATH directory does not exist."""
        non_existent = Path(tempfile.gettempdir()) / "non_existent_chroma_9999"
        with patch.object(knowledge_base, "CHROMA_DB_PATH", non_existent):
            self.assertFalse(is_vector_database_ready())

    def test_is_vector_database_ready_false_when_empty_collection(self):
        """Readiness returns False if Chroma collection has 0 documents."""
        temp_dir = tempfile.mkdtemp()
        try:
            mock_vdb = MagicMock()
            mock_vdb._collection.count.return_value = 0
            with patch.object(knowledge_base, "CHROMA_DB_PATH", Path(temp_dir)), \
                 patch.object(knowledge_base, "load_vector_database", return_value=mock_vdb):
                self.assertFalse(is_vector_database_ready())
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_is_vector_database_ready_true_when_populated(self):
        """Readiness returns True when Chroma collection has indexed documents."""
        temp_dir = tempfile.mkdtemp()
        try:
            mock_vdb = MagicMock()
            mock_vdb._collection.count.return_value = 142
            with patch.object(knowledge_base, "CHROMA_DB_PATH", Path(temp_dir)), \
                 patch.object(knowledge_base, "load_vector_database", return_value=mock_vdb):
                self.assertTrue(is_vector_database_ready())
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_initialize_knowledge_base_preserves_existing_index(self):
        """If vector database is already ready, initialize_knowledge_base reuses it without rebuilding."""
        with patch.object(knowledge_base, "is_vector_database_ready", return_value=True), \
             patch.object(knowledge_base, "rebuild_vector_database") as mock_rebuild:
            success = initialize_knowledge_base(force_rebuild=False)
            self.assertTrue(success)
            self.assertTrue(knowledge_base.KNOWLEDGE_BASE_READY.is_set())
            mock_rebuild.assert_not_called()

    def test_initialize_knowledge_base_rebuilds_when_missing_without_deleting(self):
        """When vector database is not ready, initialize_knowledge_base triggers rebuild safely."""
        with patch.object(knowledge_base, "is_vector_database_ready", side_effect=[False, True]), \
             patch.object(knowledge_base, "rebuild_vector_database") as mock_rebuild:
            success = initialize_knowledge_base(force_rebuild=False)
            self.assertTrue(success)
            self.assertTrue(knowledge_base.KNOWLEDGE_BASE_READY.is_set())
            mock_rebuild.assert_called_once_with(replace_existing=False)

    def test_rebuild_refuses_deletion_outside_backend(self):
        """Safety guard: rebuild_vector_database refuses to delete a persistent directory outside backend root."""
        temp_dir = tempfile.mkdtemp()
        try:
            external_path = Path(temp_dir)
            with patch.object(knowledge_base, "CHROMA_DB_PATH", external_path):
                with self.assertRaises(RuntimeError) as ctx:
                    rebuild_vector_database(replace_existing=True)
                self.assertIn("Refusing to replace a vector database outside the backend", str(ctx.exception))
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
