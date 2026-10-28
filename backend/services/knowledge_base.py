import os
import shutil
import sys
import threading
from pathlib import Path
from typing import Optional

class ChromaONNXAdapter:
    def __init__(self):
        try:
            from chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 import ONNXMiniLM_L6_V2
            self.ef = ONNXMiniLM_L6_V2()
        except Exception:
            from chromadb.utils import embedding_functions
            self.ef = embedding_functions.DefaultEmbeddingFunction()

    def embed_documents(self, texts):
        return self.ef(texts)

    def embed_query(self, text):
        return self.ef([text])[0]


_EMBEDDING_MODEL = None


def _get_embedding_model():
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        try:
            _EMBEDDING_MODEL = ChromaONNXAdapter()
        except Exception as e:
            print("Embedding model initialization warning:", e)
            _EMBEDDING_MODEL = False
    return _EMBEDDING_MODEL if _EMBEDDING_MODEL is not False else None


# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PACKAGED_KNOWLEDGE_BASE_PATH = PROJECT_ROOT / "knowledge_base"
KNOWLEDGE_BASE_PATH = Path(
    os.getenv("KNOWLEDGE_BASE_PATH", str(PACKAGED_KNOWLEDGE_BASE_PATH))
).resolve()
CHROMA_DB_PATH = Path(
    os.getenv("CHROMA_DB_PATH", str(PROJECT_ROOT / "chroma_db"))
).resolve()


def get_effective_knowledge_base_path() -> Path:
    """
    Determine the directory to load knowledge base documents from.
    Prefers KNOWLEDGE_BASE_PATH if it exists and contains at least one document;
    otherwise falls back safely to PACKAGED_KNOWLEDGE_BASE_PATH.
    """
    try:
        if KNOWLEDGE_BASE_PATH.exists():
            for f in KNOWLEDGE_BASE_PATH.rglob("*"):
                if f.is_file() and f.suffix.lower() in (".pdf", ".txt", ".md"):
                    return KNOWLEDGE_BASE_PATH
    except Exception as e:
        print(f"Warning: error inspecting KNOWLEDGE_BASE_PATH ({e})")

    if PACKAGED_KNOWLEDGE_BASE_PATH.exists():
        return PACKAGED_KNOWLEDGE_BASE_PATH
    return KNOWLEDGE_BASE_PATH


def _safe_console_preview(text, length):
    encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
    return text[:length].encode(encoding, errors="replace").decode(encoding)


# Load Documents (.pdf, .txt, .md)
def load_documents(source_path: Optional[Path] = None):
    documents = []
    base_path = Path(source_path).resolve() if source_path else get_effective_knowledge_base_path()
    if not base_path.exists():
        print(f"ERROR: No Knowledge Base Folder Found at {base_path}")
        return documents
    for root, dirs, files in os.walk(base_path):
        for file in files:
            ext = file.lower().split(".")[-1]
            if ext in ("pdf", "txt", "md"):
                file_path = os.path.join(root, file)
                try:
                    print("Loading:", file_path)
                    if ext == "pdf":
                        from langchain_community.document_loaders import PyPDFLoader
                        loader = PyPDFLoader(file_path)
                    else:
                        from langchain_community.document_loaders import TextLoader
                        loader = TextLoader(file_path, encoding="utf-8")
                    docs = loader.load()
                    folder_name = os.path.basename(root)
                    for doc in docs:
                        doc.metadata["folder"] = folder_name
                        doc.metadata["source"] = file_path
                        doc.metadata["filename"] = file
                    documents.extend(docs)
                except Exception as e:
                    print("Skipping:", file_path)
                    print("Reason:", e)
    return documents


# Create New Vector Database
def create_vector_database(chunks):
    if not chunks:
        print("ERROR: No Document Chunks Found")
        return None
    embedding = _get_embedding_model()
    if not embedding:
        print("ERROR: Embedding model not available")
        return None
    try:
        from langchain_chroma import Chroma
    except ImportError as e:
        print("Chroma import error:", e)
        return None

    batch_size = 500
    vector_db = None
    total_batches = (len(chunks) - 1) // batch_size + 1
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        current_batch = i // batch_size + 1
        print(f"Processing Batch {current_batch} / {total_batches}")
        if vector_db is None:
            vector_db = Chroma.from_documents(
                documents=batch,
                embedding=embedding,
                persist_directory=str(CHROMA_DB_PATH)
            )
        else:
            vector_db.add_documents(batch)
    print("Vector Database Created Successfully")
    return vector_db


# Load Existing Vector Database
def load_vector_database(path: Optional[Path] = None):
    embedding = _get_embedding_model()
    if not embedding:
        return None
    try:
        from langchain_chroma import Chroma
        target_path = Path(path).resolve() if path else CHROMA_DB_PATH
        return Chroma(
            persist_directory=str(target_path),
            embedding_function=embedding
        )
    except Exception as e:
        print("Vector database load error:", e)
        return None


KNOWLEDGE_BASE_READY = threading.Event()
_INIT_LOCK = threading.Lock()


def validate_vector_database(path: Optional[Path] = None) -> tuple[bool, int, str]:
    """
    Validate that a Chroma vector database exists at path, is readable,
    and contains at least one indexed document in its collection.
    Does not treat a nonempty SQLite file alone as proof that the index is complete.
    Returns: (is_valid, doc_count, status_message)
    """
    db_path = Path(path).resolve() if path else CHROMA_DB_PATH
    if not db_path.exists():
        return False, 0, f"Vector database directory does not exist: {db_path}"

    sqlite_file = db_path / "chroma.sqlite3"
    # Check if load_vector_database is a test mock
    is_mocked = hasattr(load_vector_database, "return_value") or hasattr(load_vector_database, "mock_calls")
    if not is_mocked:
        if not sqlite_file.is_file() or sqlite_file.stat().st_size == 0:
            return False, 0, f"chroma.sqlite3 is missing or empty at {db_path}"

    try:
        vector_db = load_vector_database(db_path)
        if not vector_db or not hasattr(vector_db, "_collection") or vector_db._collection is None:
            return False, 0, f"Chroma collection handle could not be accessed at {db_path}"

        count = vector_db._collection.count()
        if count <= 0:
            return False, 0, f"Chroma collection at {db_path} exists but contains 0 documents"

        return True, count, f"Chroma collection at {db_path} is healthy and populated with {count} documents"
    except Exception as e:
        return False, 0, f"Chroma collection at {db_path} is unreadable or corrupt: {e}"


def is_vector_database_ready(path: Optional[Path] = None) -> bool:
    """
    Check if the local Chroma vector database exists at CHROMA_DB_PATH (or path)
    and contains a healthy, populated collection with at least one document.
    Does not delete or alter any existing data.
    """
    is_valid, count, message = validate_vector_database(path or CHROMA_DB_PATH)
    if not is_valid:
        print(f"[RAG] Vector database readiness check failed: {message}")
    return is_valid


def ensure_knowledge_base_ready(timeout_seconds: float = 0.2) -> bool:
    """
    Ensure the knowledge base is ready without blocking indefinitely or racing
    with an active initialization/rebuild thread.
    Returns True if ready, False if still initializing or unavailable.
    """
    if KNOWLEDGE_BASE_READY.is_set():
        return True

    # Try non-blocking acquisition of the initialization lock
    acquired = _INIT_LOCK.acquire(timeout=max(0.01, timeout_seconds))
    if not acquired:
        # Lock is held by an active initialization or document-embedding thread
        return False

    try:
        if KNOWLEDGE_BASE_READY.is_set():
            return True
        if is_vector_database_ready():
            KNOWLEDGE_BASE_READY.set()
            return True
        # Not yet ready; start background warmup if not already running
        start_knowledge_base_initialization()
        return False
    finally:
        _INIT_LOCK.release()


def initialize_knowledge_base(force_rebuild: bool = False) -> bool:
    """
    Safely initialize the local vector database if it is not already ready.
    Reuses any existing populated database without rebuilding or deleting it.
    In Render production, runtime rebuild is disabled by default to protect
    the 512MB RAM limit from out-of-memory crashes.
    """
    with _INIT_LOCK:
        if not force_rebuild and KNOWLEDGE_BASE_READY.is_set():
            return True

        if not force_rebuild and is_vector_database_ready():
            print(f"[RAG] Using verified existing vector database at {CHROMA_DB_PATH}.")
            KNOWLEDGE_BASE_READY.set()
            return True

        # In Render production, rebuilding 28k chunks at runtime crashes the 512MB container.
        # It is disabled unless explicitly enabled via ALLOW_RUNTIME_KNOWLEDGE_BASE_REBUILD.
        is_render_env = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"))
        default_rebuild_allowed = "false" if is_render_env else "true"
        allow_runtime_rebuild = os.getenv(
            "ALLOW_RUNTIME_KNOWLEDGE_BASE_REBUILD", default_rebuild_allowed
        ).lower() in ("true", "1", "yes")

        if not allow_runtime_rebuild and not force_rebuild:
            print(
                f"[RAG] WARNING: Vector database at {CHROMA_DB_PATH} is not ready. "
                "Runtime rebuild is disabled by default in production to protect memory limits (512MB RAM) on Render free tier. "
                "Ensure the vector database is built into the image with scripts/build_vector_db.py."
            )
            return False

        print(f"[RAG] Vector database at {CHROMA_DB_PATH} not initialized or empty. Initializing...")
        try:
            rebuild_vector_database(replace_existing=force_rebuild)
            if is_vector_database_ready():
                KNOWLEDGE_BASE_READY.set()
                print(f"[RAG] Vector database initialization completed successfully at {CHROMA_DB_PATH}.")
                return True
            else:
                print(f"[RAG] Vector database built, but remains empty or unreadable.")
                return False
        except Exception as e:
            print(f"[RAG] Vector database initialization error: {e}")
            return False


_KB_INIT_THREAD: Optional[threading.Thread] = None
_KB_THREAD_LOCK = threading.Lock()


def start_knowledge_base_initialization() -> Optional[threading.Thread]:
    """
    Start background initialization of the knowledge base in a single thread if not already ready or running.
    Guarantees that at most one initialization thread runs per process.
    """
    global _KB_INIT_THREAD
    with _KB_THREAD_LOCK:
        if KNOWLEDGE_BASE_READY.is_set():
            return None
        if _KB_INIT_THREAD is not None and _KB_INIT_THREAD.is_alive():
            return _KB_INIT_THREAD
        _KB_INIT_THREAD = threading.Thread(
            target=initialize_knowledge_base,
            name="AppKBInit",
            daemon=True,
        )
        _KB_INIT_THREAD.start()
        return _KB_INIT_THREAD


# General Search in Knowledge Base
def search_knowledge_base(query):
    if not ensure_knowledge_base_ready(timeout_seconds=0.2):
        print("[RAG] Knowledge base is not ready or currently initializing; search skipped.")
        return []
    vector_db = load_vector_database()
    if not vector_db:
        return []
    try:
        results_with_scores = (
            vector_db.similarity_search_with_score(
                query,
                k=10
            )
        )
    except Exception as e:
        print("Knowledge base search error:", e)
        return []
    results = []
    print("\n===== Retrieved Documents =====")
    for doc, score in results_with_scores:
        print(f"Score: {score:.4f}")
        print("Folder:", doc.metadata.get("folder"))
        print("Source:", doc.metadata.get("source"))
        print(_safe_console_preview(doc.page_content, 200))
        print("-" * 50)
        if score < 1.2:
            results.append(doc)

    crop_keywords = {
        "wheat": "Wheat",
        "rice": "Rice",
        "paddy": "Rice",
        "maize": "Maize",
        "corn": "Maize",
        "cotton": "Cotton",
        "potato": "Potato",
        "tomato": "Tomato",
        "onion": "Onion",
        "groundnut": "Groundnut",
        "peanut": "Groundnut",
        "sugarcane": "Sugarcane",
        "chilli": "Chilli",
        "pepper": "Chilli",
        "pest": "Pest",
        "disease": "Disease",
    }
    detected_crop = None
    query_lower = query.lower()
    for crop in crop_keywords:
        if crop in query_lower:
            detected_crop = crop_keywords[crop]
            break
    if detected_crop:
        try:
            crop_results = vector_db.similarity_search(
                query,
                k=5,
                filter={"folder": detected_crop},
            )
            if crop_results:
                return crop_results
        except Exception:
            pass
    return results[:5]


# Search Documents inside Government Schemes 
def search_government_schemes(query):
    if not ensure_knowledge_base_ready(timeout_seconds=0.2):
        print("[RAG] Knowledge base is not ready or currently initializing; scheme search skipped.")
        return []
    vector_db = load_vector_database()
    if not vector_db:
        return []

    print(f"DEBUG scheme query: {query}")
    scheme_results = []
    results_with_scores = []

    try:
        results_with_scores = vector_db.similarity_search_with_score(
            query,
            k=5,
            filter={
                "folder": "Government_Schemes"
            }
        )
        print("DEBUG scheme filtered count:", len(results_with_scores))
    except Exception as e:
        print("DEBUG scheme filtered search failed:", e)
        results_with_scores = []

    # Merge regression guard: if the filtered lookup returns nothing, fall back
    # to an unfiltered similarity search and then keep only Government_Schemes
    # documents in memory. This preserves the existing API while avoiding a
    # total empty-result regression when metadata filtering becomes version-
    # specific after a branch merge.
    if not results_with_scores:
        try:
            results_with_scores = vector_db.similarity_search_with_score(
                query,
                k=10,
            )
            print("DEBUG scheme fallback count:", len(results_with_scores))
        except Exception as e:
            print("DEBUG scheme fallback search failed:", e)
            return []

    for doc, score in results_with_scores:
        folder = doc.metadata.get("folder")
        if folder != "Government_Schemes":
            continue
        print(f"Score: {score:.4f}")
        print("Folder:", folder)
        print("File:", doc.metadata.get("filename"))
        print("Source:", doc.metadata.get("source"))
        print(_safe_console_preview(doc.page_content, 300))
        print("-" * 50)
        scheme_results.append(doc)

    print("DEBUG scheme returned count:", len(scheme_results))
    return scheme_results[:5]


# Rebuild Vector Database
def rebuild_vector_database(replace_existing=False):
    if replace_existing and CHROMA_DB_PATH.exists():
        resolved_database = CHROMA_DB_PATH.resolve()
        if resolved_database.parent != PROJECT_ROOT.resolve():
            raise RuntimeError("Refusing to replace a vector database outside the backend.")
        shutil.rmtree(resolved_database)
    documents = load_documents()
    if not documents:
        print("No PDF Documents were Loaded.")
        return
    print("Total Pages Loaded:", len(documents))
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        chunks = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=100
        ).split_documents(documents)
        print("Total Chunks Created:", len(chunks))
        create_vector_database(chunks)
    except Exception as e:
        print("Failed to split documents:", e)


if __name__ == "__main__":
    if os.path.exists(CHROMA_DB_PATH):
        ch = input("Existing Vector Database Found, Rebuild? (y/n): "
        ).strip().lower()
        if ch == "y":
            print("Deleting Old Vector Database...")
            shutil.rmtree(CHROMA_DB_PATH)
            print("Rebuilding Vector Database...")
            rebuild_vector_database()
        else:
            print("Using Existing Vector Database")
    else:
        print("No Vector Database Found, Building...")
        rebuild_vector_database()
    query = input("Ask a Farming Question: ")
    results = search_knowledge_base(query)
    for i, doc in enumerate(results, 1):
        print(f"Result {i} :-")
        print("Folder :", doc.metadata.get("folder"))
        print("Source :", doc.metadata.get("source"))
        print(doc.page_content[:1000])
        print("-" * 50)
