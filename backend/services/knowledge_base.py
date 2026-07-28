import os
import shutil
import sys
from pathlib import Path
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
KNOWLEDGE_BASE_PATH = PROJECT_ROOT / "knowledge_base"
CHROMA_DB_PATH = PROJECT_ROOT / "chroma_db"
EMBEDDING_MODEL = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    # This public model must not use a stale local Hugging Face login token.
    model_kwargs={"token": False},
)


def _safe_console_preview(text, length):
    encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
    return text[:length].encode(encoding, errors="replace").decode(encoding)


# Load PDF Documents
def load_documents():
    documents = []
    if not os.path.exists(KNOWLEDGE_BASE_PATH):
        print("ERROR: No Knowledge Base Folder Found")
        return documents
    for root, dirs, files in os.walk(KNOWLEDGE_BASE_PATH):
        for file in files:
            if file.lower().endswith(".pdf"):
                pdf_path = os.path.join(root, file)
                try:
                    print("Loading:", pdf_path)
                    loader = PyPDFLoader(pdf_path)
                    docs = loader.load()
                    folder_name = os.path.basename(root)
                    for doc in docs:
                        doc.metadata["folder"] = folder_name
                        doc.metadata["source"] = pdf_path
                        doc.metadata["filename"] = file
                    documents.extend(docs)
                except Exception as e:
                    print("Skipping:", pdf_path)
                    print("Reason:", e)
    return documents

# Create New Vector Database
def create_vector_database(chunks):
    if not chunks:
        print("ERROR: No Document Chunks Found")
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
                embedding=EMBEDDING_MODEL,
                persist_directory=CHROMA_DB_PATH
            )
        else:
            vector_db.add_documents(batch)
    print("Vector Database Created Successfully")
    return vector_db

# Load Existing Vector Database
def load_vector_database():
    return Chroma(
        persist_directory=CHROMA_DB_PATH,
        embedding_function=EMBEDDING_MODEL
    )

# Genearal Search in Knowledge Base
def search_knowledge_base(query):
    vector_db = load_vector_database()
    results_with_scores = (
        vector_db.similarity_search_with_score(
            query,
            k=10
        )
    )
    results = []
    print("\n===== Retrieved Documents =====")
    for doc, score in results_with_scores:
        print(f"Score: {score:.4f}")
        print("Folder:", doc.metadata.get("folder"))
        print("Source:", doc.metadata.get("source"))
        # Some PDFs contain private-use glyphs that Windows consoles cannot
        # encode. Diagnostic output must never break an otherwise valid search.
        print(_safe_console_preview(doc.page_content, 200))
        print("-" * 50)
        if score < 1.2:
            results.append(doc)
    # Crop Detection
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
    # Return Crop Specific Documents
    if detected_crop:
        crop_results = vector_db.similarity_search(
            query,
            k=5,
            filter={"folder": detected_crop},
        )
        if crop_results:
            return crop_results
    return results[:5]

# Search Documents inside Government Schemes 
def search_government_schemes(query):
    vector_db = load_vector_database()
    results_with_scores = (
        vector_db.similarity_search_with_score(
            query,
            k=5,
            filter={
                "folder": "Government_Schemes"
            }
        )
    )
    scheme_results = []
    print("\n===== Government Scheme Results =====")
    for doc, score in results_with_scores:
        print(f"Score: {score:.4f}")
        print("Folder:", doc.metadata.get("folder"))
        print("File:", doc.metadata.get("filename"))
        print("Source:", doc.metadata.get("source"))
        print(_safe_console_preview(doc.page_content, 300))
        print("-" * 50)
        # No Score Threshold for Now.
        # First Verify Scheme Retrieval Works.
        scheme_results.append(doc)
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
    chunks = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    ).split_documents(documents)
    print("Total Chunks Created:", len(chunks))
    create_vector_database(chunks)

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
