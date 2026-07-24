import os
import shutil

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings


# =========================================================
# PATH CONFIGURATION
# =========================================================

# Current file:
# AgriAI/backend/services/knowledge_base.py

# Go up:
# services -> backend -> AgriAI
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )
)

# PDFs are located here:
# AgriAI/farmer_backend/knowledge_base
KNOWLEDGE_BASE_PATH = os.path.join(
    PROJECT_ROOT,
    "farmer_backend",
    "knowledge_base"
)

# Keep Chroma DB inside the currently used backend:
# AgriAI/backend/chroma_db
BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

CHROMA_DB_PATH = os.path.join(
    BACKEND_DIR,
    "chroma_db"
)

print("Project Root:", PROJECT_ROOT)
print("Knowledge Base Path:", KNOWLEDGE_BASE_PATH)
print("Chroma DB Path:", CHROMA_DB_PATH)


# =========================================================
# LOAD PDF DOCUMENTS
# =========================================================

def load_documents():
    documents = []

    if not os.path.exists(KNOWLEDGE_BASE_PATH):
        print("\nERROR: Knowledge base folder not found:")
        print(KNOWLEDGE_BASE_PATH)
        return documents

    print("\nLoading documents from:")
    print(KNOWLEDGE_BASE_PATH)
    print()

    for root, dirs, files in os.walk(KNOWLEDGE_BASE_PATH):

        for file in files:

            if file.lower().endswith(".pdf"):

                pdf_path = os.path.join(root, file)

                try:
                    print("Loading:", pdf_path)

                    loader = PyPDFLoader(pdf_path)

                    docs = loader.load()

                    # Example:
                    #
                    # Government_Schemes/PM_Kisan.pdf
                    # folder = Government_Schemes
                    #
                    # Crops/Rice/Rice_Production_Guide.pdf
                    # folder = Rice

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


# =========================================================
# SPLIT DOCUMENTS
# =========================================================

def split_documents(documents):

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )

    return splitter.split_documents(documents)


# =========================================================
# EMBEDDING MODEL
# =========================================================

def get_embedding_model():

    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )


# =========================================================
# CREATE VECTOR DATABASE
# =========================================================

def create_vector_database(chunks):

    if not chunks:
        print("\nNo document chunks found.")
        print("Vector database cannot be created.")
        return None

    embedding_model = get_embedding_model()

    batch_size = 500

    vector_db = None

    total_batches = (len(chunks) - 1) // batch_size + 1

    for i in range(0, len(chunks), batch_size):

        batch = chunks[i:i + batch_size]

        current_batch = i // batch_size + 1

        print(
            f"Processing batch {current_batch} / {total_batches}"
        )

        if vector_db is None:

            vector_db = Chroma.from_documents(
                documents=batch,
                embedding=embedding_model,
                persist_directory=CHROMA_DB_PATH
            )

        else:

            vector_db.add_documents(batch)

    print("\nVector Database created successfully!")

    return vector_db


# =========================================================
# LOAD EXISTING VECTOR DATABASE
# =========================================================

def load_vector_database():

    embedding_model = get_embedding_model()

    return Chroma(
        persist_directory=CHROMA_DB_PATH,
        embedding_function=embedding_model
    )


# =========================================================
# GENERAL KNOWLEDGE BASE SEARCH
# =========================================================

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

        print(
            "Folder:",
            doc.metadata.get("folder")
        )

        print(
            "Source:",
            doc.metadata.get("source")
        )

        print(doc.page_content[:200])

        print("-" * 50)

        if score < 1.2:
            results.append(doc)

    # -----------------------------------------------------
    # Crop detection
    # -----------------------------------------------------

    crop_keywords = {

        "wheat": "Wheat",

        "rice": "Rice",

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

    # -----------------------------------------------------
    # Return crop-specific documents
    # -----------------------------------------------------

    if detected_crop:

        crop_results = []

        for doc in results:

            if (
                doc.metadata.get("folder")
                == detected_crop
            ):

                crop_results.append(doc)

        if crop_results:

            return crop_results[:5]

    return results[:5]


# =========================================================
# GOVERNMENT SCHEME SEARCH
# =========================================================

def search_government_schemes(query):
    """
    Search ONLY documents stored inside the
    Government_Schemes folder.
    """

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

    print(
        "\n===== Government Scheme Results ====="
    )

    for doc, score in results_with_scores:

        print(f"Score: {score:.4f}")

        print(
            "Folder:",
            doc.metadata.get("folder")
        )

        print(
            "File:",
            doc.metadata.get("filename")
        )

        print(
            "Source:",
            doc.metadata.get("source")
        )

        print(doc.page_content[:300])

        print("-" * 50)

        # No score threshold for now.
        # First verify scheme retrieval works.
        scheme_results.append(doc)

    return scheme_results[:5]


# =========================================================
# REBUILD VECTOR DATABASE
# =========================================================

def rebuild_vector_database():

    if os.path.exists(CHROMA_DB_PATH):

        print("\nDeleting old Vector Database...")

        shutil.rmtree(CHROMA_DB_PATH)

        print("Old Vector Database deleted.")

    print("\nCreating new Vector Database...\n")

    documents = load_documents()

    print(
        f"\nTotal Pages Loaded: {len(documents)}"
    )

    if not documents:

        print(
            "\nNo PDF documents were loaded."
        )

        return

    chunks = split_documents(documents)

    print(
        f"Total Chunks Created: {len(chunks)}"
    )

    create_vector_database(chunks)


# =========================================================
# TEST
# =========================================================

if __name__ == "__main__":

    print("\n================================")
    print(" AGRICULTURAL KNOWLEDGE BASE")
    print("================================")

    if os.path.exists(CHROMA_DB_PATH):

        choice = input(
            "\nExisting Vector Database found.\n"
            "Rebuild it? (y/n): "
        ).strip().lower()

        if choice == "y":

            rebuild_vector_database()

        else:

            print(
                "\nUsing existing Vector Database."
            )

    else:

        print(
            "\nNo Vector Database found."
        )

        rebuild_vector_database()

    query = input(
        "\nAsk a farming question: "
    )

    results = search_knowledge_base(query)

    print("\nTop Results:\n")

    for i, doc in enumerate(results, 1):

        print(f"Result {i}")

        print("-" * 50)

        print(
            "Folder:",
            doc.metadata.get("folder")
        )

        print(
            "Source:",
            doc.metadata.get("source")
        )

        print()

        print(
            doc.page_content[:1000]
        )

        print()