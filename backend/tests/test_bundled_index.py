import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from langchain_core.documents import Document

from services import knowledge_base
from services.knowledge_base import (
    CHROMA_DB_PATH,
    KNOWLEDGE_BASE_READY,
    _get_embedding_model,
    ensure_knowledge_base_ready,
    initialize_knowledge_base,
    is_vector_database_ready,
    load_vector_database,
    rebuild_vector_database,
    search_government_schemes,
    search_knowledge_base,
    validate_vector_database,
)
from scripts.build_vector_db import build_vector_database


class TestBundledIndexValidationAndLifecycle(unittest.TestCase):
    def setUp(self):
        KNOWLEDGE_BASE_READY.clear()
        self.temp_dirs = []

    def tearDown(self):
        KNOWLEDGE_BASE_READY.clear()
        for d in self.temp_dirs:
            shutil.rmtree(d, ignore_errors=True)

    def _create_temp_dir(self) -> Path:
        td = Path(tempfile.mkdtemp())
        self.temp_dirs.append(td)
        return td

    def test_validate_vector_database_nonexistent_directory(self):
        """Returns False with count 0 when directory does not exist."""
        non_existent = self._create_temp_dir() / "does_not_exist"
        is_valid, count, msg = validate_vector_database(non_existent)
        self.assertFalse(is_valid)
        self.assertEqual(count, 0)
        self.assertIn("does not exist", msg)

    def test_validate_vector_database_empty_directory(self):
        """Returns False with count 0 when directory is empty."""
        empty_dir = self._create_temp_dir()
        is_valid, count, msg = validate_vector_database(empty_dir)
        self.assertFalse(is_valid)
        self.assertEqual(count, 0)
        self.assertIn("missing or empty", msg)

    def test_validate_vector_database_zero_byte_sqlite_file(self):
        """Zero-byte chroma.sqlite3 file alone is NOT accepted as proof of completeness."""
        temp_dir = self._create_temp_dir()
        sqlite_file = temp_dir / "chroma.sqlite3"
        sqlite_file.write_bytes(b"")
        is_valid, count, msg = validate_vector_database(temp_dir)
        self.assertFalse(is_valid)
        self.assertEqual(count, 0)
        self.assertIn("missing or empty", msg)

    def test_validate_vector_database_empty_collection(self):
        """A collection containing 0 documents is rejected even if initialized."""
        temp_dir = self._create_temp_dir()
        sqlite_file = temp_dir / "chroma.sqlite3"
        sqlite_file.write_bytes(b"SQLite format 3\x00")

        mock_vdb = MagicMock()
        mock_vdb._collection.count.return_value = 0

        with patch.object(knowledge_base, "load_vector_database", return_value=mock_vdb):
            is_valid, count, msg = validate_vector_database(temp_dir)
            self.assertFalse(is_valid)
            self.assertEqual(count, 0)
            self.assertIn("contains 0 documents", msg)

    def test_validate_vector_database_populated_collection(self):
        """A collection containing indexed documents returns True with count."""
        temp_dir = self._create_temp_dir()
        sqlite_file = temp_dir / "chroma.sqlite3"
        sqlite_file.write_bytes(b"SQLite format 3\x00")

        mock_vdb = MagicMock()
        mock_vdb._collection.count.return_value = 28437

        with patch.object(knowledge_base, "load_vector_database", return_value=mock_vdb):
            is_valid, count, msg = validate_vector_database(temp_dir)
            self.assertTrue(is_valid)
            self.assertEqual(count, 28437)
            self.assertIn("healthy and populated", msg)

    def test_restart_reuse_validates_and_skips_rebuild(self):
        """On container restart, a healthy bundled index is reused immediately without rebuild."""
        mock_vdb = MagicMock()
        mock_vdb._collection.count.return_value = 1500

        temp_dir = self._create_temp_dir()
        sqlite_file = temp_dir / "chroma.sqlite3"
        sqlite_file.write_bytes(b"SQLite format 3\x00")

        with patch.object(knowledge_base, "CHROMA_DB_PATH", temp_dir), \
             patch.object(knowledge_base, "load_vector_database", return_value=mock_vdb), \
             patch.object(knowledge_base, "rebuild_vector_database") as mock_rebuild:
            success = initialize_knowledge_base(force_rebuild=False)
            self.assertTrue(success)
            self.assertTrue(KNOWLEDGE_BASE_READY.is_set())
            mock_rebuild.assert_not_called()

    def test_production_runtime_rebuild_disabled_on_missing_index(self):
        """In Render production (RENDER=true), a missing index logs a warning and does not OOM-rebuild."""
        temp_dir = self._create_temp_dir()
        # Non-existent DB path
        missing_db = temp_dir / "missing_chroma"

        with patch.dict(os.environ, {"RENDER": "true"}, clear=False), \
             patch.object(knowledge_base, "CHROMA_DB_PATH", missing_db), \
             patch.object(knowledge_base, "rebuild_vector_database") as mock_rebuild:
            success = initialize_knowledge_base(force_rebuild=False)
            self.assertFalse(success)
            self.assertFalse(KNOWLEDGE_BASE_READY.is_set())
            # Critical: rebuild must not be called in production to avoid crashing 512MB RAM
            mock_rebuild.assert_not_called()

    def test_build_script_fails_on_missing_source_directory(self):
        """build_vector_database returns code 1 if the source KB directory does not exist."""
        missing_kb = self._create_temp_dir() / "non_existent_kb"
        target_chroma = self._create_temp_dir() / "chroma_out"
        code = build_vector_database(kb_path=missing_kb, chroma_path=target_chroma)
        self.assertEqual(code, 1)

    def test_build_script_detects_existing_valid_index(self):
        """build_vector_database recognizes an existing valid database and skips re-embedding."""
        temp_dir = self._create_temp_dir()
        fake_chroma = temp_dir / "chroma_db"
        fake_chroma.mkdir(parents=True, exist_ok=True)
        (fake_chroma / "chroma.sqlite3").write_bytes(b"SQLite format 3\x00")

        mock_vdb = MagicMock()
        mock_vdb._collection.count.return_value = 500
        mock_vdb.similarity_search.return_value = [
            Document(page_content="Wheat rust info", metadata={"filename": "Wheat.pdf", "folder": "Crops/Wheat"})
        ]

        with patch.object(knowledge_base, "load_vector_database", return_value=mock_vdb), \
             patch("langchain_chroma.Chroma", return_value=mock_vdb):
            code = build_vector_database(
                kb_path=self._create_temp_dir(),
                chroma_path=fake_chroma,
                force=False,
            )
            self.assertEqual(code, 0)

    def test_search_uses_bundled_index_for_crop_and_schemes(self):
        """search_knowledge_base and search_government_schemes query the verified database."""
        KNOWLEDGE_BASE_READY.set()

        crop_doc = Document(
            page_content="Tomato leaf curl virus management through vector control.",
            metadata={"folder": "Tomato", "filename": "Tomato_Guide.pdf", "source": "/app/Tomato_Guide.pdf"},
        )
        scheme_doc = Document(
            page_content="PM-KISAN provides income support of Rs 6000 per year to eligible farmers.",
            metadata={"folder": "Government_Schemes", "filename": "PM_Kisan.pdf", "source": "/app/PM_Kisan.pdf"},
        )

        mock_vdb = MagicMock()
        mock_vdb.similarity_search_with_score.side_effect = [
            [(crop_doc, 0.4)],     # search_knowledge_base general
            [(scheme_doc, 0.3)],   # search_government_schemes filtered
        ]
        mock_vdb.similarity_search.return_value = [crop_doc]

        with patch.object(knowledge_base, "load_vector_database", return_value=mock_vdb):
            crop_res = search_knowledge_base("tomato viral diseases")
            self.assertEqual(len(crop_res), 1)
            self.assertEqual(crop_res[0].metadata["folder"], "Tomato")

            scheme_res = search_government_schemes("PM-KISAN installment eligibility")
            self.assertEqual(len(scheme_res), 1)
            self.assertEqual(scheme_res[0].metadata["folder"], "Government_Schemes")


if __name__ == "__main__":
    unittest.main()
