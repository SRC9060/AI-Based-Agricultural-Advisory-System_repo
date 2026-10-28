#!/usr/bin/env python3
"""
Deterministic build script for the AgriAdvisor Chroma Vector Database.

Builds and verifies the local Chroma vector index from the agricultural
knowledge-base documents during the Docker image build.
Ensures that:
1. Source documents are loaded and chunked with consistent metadata.
2. The Chroma collection is populated and verified (count > 0).
3. The ONNX embedding model is downloaded and cached inside the image.
4. The image build fails clearly with a non-zero exit code if indexing fails.
"""

import argparse
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Optional

# Ensure backend root is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.knowledge_base import (
    CHROMA_DB_PATH,
    PACKAGED_KNOWLEDGE_BASE_PATH,
    _get_embedding_model,
    load_documents,
    validate_vector_database,
)


def _compute_dir_size_mb(path: Path) -> float:
    """Compute the total disk usage of a directory in megabytes."""
    if not path.exists():
        return 0.0
    total_bytes = 0
    for entry in path.rglob("*"):
        if entry.is_file():
            total_bytes += entry.stat().st_size
    return total_bytes / (1024.0 * 1024.0)


def build_vector_database(
    kb_path: Path,
    chroma_path: Path,
    batch_size: int = 500,
    max_chunks: Optional[int] = None,
    force: bool = False,
) -> int:
    """
    Build and verify the Chroma vector database.
    Returns 0 on success, non-zero on failure.
    """
    start_time = time.time()
    print("=" * 64)
    print("AgriAdvisor Vector Database Image Builder")
    print("=" * 64)
    print(f"[BUILD] Source Documents Path: {kb_path}")
    print(f"[BUILD] Target Chroma DB Path: {chroma_path}")
    print(f"[BUILD] Batch Size:           {batch_size}")
    if max_chunks:
        print(f"[BUILD] Max Chunks Limit:     {max_chunks}")
    print("=" * 64)

    # 1. Check if an already valid, populated vector database exists
    if not force:
        is_valid, count, status_msg = validate_vector_database(chroma_path)
        if is_valid and count > 0:
            print(f"[BUILD] Existing valid Chroma database found: {status_msg}")
            print("[BUILD] Verifying search readiness and model pre-cache...")
            try:
                embedding = _get_embedding_model()
                from langchain_chroma import Chroma
                vdb = Chroma(persist_directory=str(chroma_path), embedding_function=embedding)
                test_results = vdb.similarity_search("wheat crop rust disease", k=1)
                if not test_results:
                    print("[BUILD] Warning: Existing database returned 0 test results; triggering rebuild.")
                else:
                    print(f"[BUILD] Test search successful. Document: {test_results[0].metadata.get('filename')}")
                    _verify_onnx_model_cached()
                    print(f"[BUILD] SUCCESS: Vector database verified ({count} documents, {_compute_dir_size_mb(chroma_path):.2f} MB).")
                    return 0
            except Exception as test_err:
                print(f"[BUILD] Warning: Existing database test search error ({test_err}); rebuilding.")

    # 2. Validate source documents path
    if not kb_path.exists():
        print(f"[BUILD ERROR] Knowledge base directory not found at: {kb_path}", file=sys.stderr)
        return 1

    # 3. Load source documents (.pdf, .txt, .md)
    print(f"[BUILD] Loading source documents from {kb_path}...")
    load_start = time.time()
    documents = load_documents(source_path=kb_path)
    load_elapsed = time.time() - load_start
    if not documents:
        print(f"[BUILD ERROR] No valid documents could be loaded from {kb_path}.", file=sys.stderr)
        return 1
    print(f"[BUILD] Successfully loaded {len(documents)} document pages in {load_elapsed:.2f}s.")

    # 4. Chunk documents
    print("[BUILD] Splitting documents into semantic chunks (chunk_size=500, overlap=100)...")
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=100,
        )
        chunks = splitter.split_documents(documents)
    except Exception as split_err:
        print(f"[BUILD ERROR] Failed to split documents: {split_err}", file=sys.stderr)
        return 1

    if not chunks:
        print("[BUILD ERROR] Document splitter generated 0 chunks.", file=sys.stderr)
        return 1

    total_chunks = len(chunks)
    print(f"[BUILD] Generated {total_chunks} text chunks.")

    if max_chunks and total_chunks > max_chunks:
        print(f"[BUILD] Applying chunk limit: indexing first {max_chunks} chunks.")
        chunks = chunks[:max_chunks]

    # 5. Initialize embedding function
    print("[BUILD] Initializing ONNX embedding model (all-MiniLM-L6-v2)...")
    embedding = _get_embedding_model()
    if not embedding:
        print("[BUILD ERROR] Failed to initialize embedding model.", file=sys.stderr)
        return 1

    # 6. Reset target directory if it exists
    if chroma_path.exists():
        print(f"[BUILD] Cleaning prior vector database directory at {chroma_path}...")
        try:
            shutil.rmtree(chroma_path)
        except Exception as clean_err:
            print(f"[BUILD ERROR] Could not clean {chroma_path}: {clean_err}", file=sys.stderr)
            return 1
    chroma_path.mkdir(parents=True, exist_ok=True)

    # 7. Embed chunks and insert into Chroma
    try:
        from langchain_chroma import Chroma
    except ImportError as imp_err:
        print(f"[BUILD ERROR] langchain-chroma is not installed: {imp_err}", file=sys.stderr)
        return 1

    print(f"[BUILD] Indexing {len(chunks)} chunks into Chroma at {chroma_path} (batch size: {batch_size})...")
    vector_db = None
    total_batches = (len(chunks) - 1) // batch_size + 1
    embed_start = time.time()

    for idx in range(0, len(chunks), batch_size):
        batch = chunks[idx : idx + batch_size]
        batch_num = (idx // batch_size) + 1
        b_start = time.time()
        try:
            if vector_db is None:
                vector_db = Chroma.from_documents(
                    documents=batch,
                    embedding=embedding,
                    persist_directory=str(chroma_path),
                )
            else:
                vector_db.add_documents(batch)
            b_elapsed = time.time() - b_start
            rate = len(batch) / max(0.01, b_elapsed)
            print(f"[BUILD] Batch {batch_num}/{total_batches} ({len(batch)} chunks) indexed in {b_elapsed:.2f}s ({rate:.1f} chunks/sec).")
        except Exception as batch_err:
            print(f"[BUILD ERROR] Failed indexing batch {batch_num}: {batch_err}", file=sys.stderr)
            return 1

    embed_elapsed = time.time() - embed_start
    print(f"[BUILD] Completed embedding {len(chunks)} chunks in {embed_elapsed:.2f}s.")

    # 8. Deterministic Verification
    print("[BUILD] Verifying Chroma database integrity...")
    is_valid, final_count, validation_msg = validate_vector_database(chroma_path)
    if not is_valid or final_count <= 0:
        print(f"[BUILD ERROR] Verification failed: {validation_msg}", file=sys.stderr)
        return 1

    print(f"[BUILD] Collection verification passed: {validation_msg}")

    # 9. Test queries
    print("[BUILD] Running semantic search test query...")
    try:
        vdb = Chroma(persist_directory=str(chroma_path), embedding_function=embedding)
        crop_results = vdb.similarity_search("wheat rust disease management", k=2)
        if not crop_results:
            print("[BUILD ERROR] Semantic search verification returned 0 results.", file=sys.stderr)
            return 1
        print(f"[BUILD] Crop search passed: top result from '{crop_results[0].metadata.get('filename')}' (folder: {crop_results[0].metadata.get('folder')}).")

        scheme_results = vdb.similarity_search("PM-KISAN financial scheme", k=2)
        if scheme_results:
            print(f"[BUILD] Scheme search passed: top result from '{scheme_results[0].metadata.get('filename')}'.")
    except Exception as query_err:
        print(f"[BUILD ERROR] Semantic search test query failed: {query_err}", file=sys.stderr)
        return 1

    # 10. Verify ONNX model pre-cache
    _verify_onnx_model_cached()

    # 11. Final Summary
    total_elapsed = time.time() - start_time
    db_size = _compute_dir_size_mb(chroma_path)
    print("=" * 64)
    print(f"[BUILD SUCCESS] Chroma Vector Database built and verified successfully!")
    print(f"  - Location:       {chroma_path}")
    print(f"  - Document Count: {final_count}")
    print(f"  - Database Size:  {db_size:.2f} MB")
    print(f"  - Elapsed Time:   {total_elapsed:.2f}s")
    print("=" * 64)
    return 0


def _verify_onnx_model_cached():
    """Verify that the ONNX model files are pre-cached in the image home directory."""
    try:
        from chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 import ONNXMiniLM_L6_V2
        cache_dir = ONNXMiniLM_L6_V2.DOWNLOAD_PATH / ONNXMiniLM_L6_V2.EXTRACTED_FOLDER_NAME
        model_file = cache_dir / "model.onnx"
        if model_file.is_file():
            size_mb = model_file.stat().st_size / (1024.0 * 1024.0)
            print(f"[BUILD] ONNX embedding model pre-cached in image at: {model_file} ({size_mb:.1f} MB).")
        else:
            print(f"[BUILD] Warning: ONNX model file not found at {model_file}; may require download on first call.")
    except Exception as e:
        print(f"[BUILD] Warning checking ONNX cache: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Build and verify the AgriAdvisor Chroma Vector Database."
    )
    parser.add_argument(
        "--kb-path",
        type=Path,
        default=PACKAGED_KNOWLEDGE_BASE_PATH,
        help="Path to the source knowledge-base folder (default: backend/knowledge_base).",
    )
    parser.add_argument(
        "--chroma-path",
        type=Path,
        default=CHROMA_DB_PATH,
        help="Path to output the Chroma vector index (default: /app/chroma_db or backend/chroma_db).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Number of document chunks per insertion batch (default: 500).",
    )
    parser.add_argument(
        "--max-chunks",
        type=int,
        default=None,
        help="Optional chunk ceiling for constrained or test builds.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force rebuild even if an existing healthy database is detected.",
    )

    args = parser.parse_args()

    # Respect environment variables if CLI args were left default
    kb_path = Path(os.getenv("KNOWLEDGE_BASE_PATH", str(args.kb_path))).resolve()
    chroma_path = Path(os.getenv("CHROMA_DB_PATH", str(args.chroma_path))).resolve()

    max_chunks_env = os.getenv("BUILD_MAX_CHUNKS")
    max_chunks = int(max_chunks_env) if max_chunks_env else args.max_chunks

    exit_code = build_vector_database(
        kb_path=kb_path,
        chroma_path=chroma_path,
        batch_size=args.batch_size,
        max_chunks=max_chunks,
        force=args.force,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
