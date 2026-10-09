import os
import shutil
import sys
from pathlib import Path

class ChromaONNXAdapter:
    def __init__(self):
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

# A cloud disk starts empty. Seed it once with the PDFs committed with the
# application, then keep subsequent admin uploads and the vector index durable.
if (
    KNOWLEDGE_BASE_PATH != PACKAGED_KNOWLEDGE_BASE_PATH.resolve()
    and PACKAGED_KNOWLEDGE_BASE_PATH.exists()
    and not any(KNOWLEDGE_BASE_PATH.rglob("*.pdf"))
):
    KNOWLEDGE_BASE_PATH.mkdir(parents=True, exist_ok=True)
    shutil.copytree(
        PACKAGED_KNOWLEDGE_BASE_PATH,
        KNOWLEDGE_BASE_PATH,
        dirs_exist_ok=True,
    )


def _safe_console_preview(text, length):
    encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
    return text[:length].encode(encoding, errors="replace").decode(encoding)


# Load Documents (.pdf, .txt, .md)
def load_documents():
    documents = []
    if not os.path.exists(KNOWLEDGE_BASE_PATH):
        print("ERROR: No Knowledge Base Folder Found")
        return documents
    for root, dirs, files in os.walk(KNOWLEDGE_BASE_PATH):
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
def load_vector_database():
    embedding = _get_embedding_model()
    if not embedding:
        return None
    try:
        from langchain_chroma import Chroma
        return Chroma(
            persist_directory=str(CHROMA_DB_PATH),
            embedding_function=embedding
        )
    except Exception as e:
        print("Vector database load error:", e)
        return None


# General Search in Knowledge Base
def search_knowledge_base(query):
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
