import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KNOWLEDGE_BASE_PATH = os.path.join(BASE_DIR, "knowledge_base")
print("Knowledge Base Path:", KNOWLEDGE_BASE_PATH)

def load_documents():
    documents = []
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
                    documents.extend(docs)
                except Exception as e:
                    print("Skipping:", pdf_path)
                    print("Reason:", e)
    return documents

def split_documents(documents):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )
    return splitter.split_documents(documents)

def create_vector_database(chunks):
    embedding_model = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    persist_directory = "chroma_db"

    batch_size = 500
    vector_db = None

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]

        print(
            f"Processing batch {i//batch_size + 1} / {(len(chunks)-1)//batch_size + 1}"
        )

        if vector_db is None:
            vector_db = Chroma.from_documents(
                documents=batch,
                embedding=embedding_model,
                persist_directory=persist_directory
            )
        else:
            vector_db.add_documents(batch)

    print("\nVector Database created successfully!")

    return vector_db

def load_vector_database():
    embedding_model = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    return Chroma(
        persist_directory="chroma_db",
        embedding_function=embedding_model
    )

def search_knowledge_base(query):
    vector_db = load_vector_database()
    results_with_scores = vector_db.similarity_search_with_score(query, k=10)
    results = []
    print("\n===== Retrieved Documents =====")
    for doc, score in results_with_scores:
        print(f"Score: {score:.4f}")
        print("Folder:", doc.metadata.get("folder"))
        print(doc.page_content[:200])
        print("-" * 50)
        if score < 1.2:
            results.append(doc)
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
    "pepper": "Chilli"
       }
    detected_crop = None
    query_lower = query.lower()
    for crop in crop_keywords:
        if crop in query_lower:
            detected_crop = crop_keywords[crop]
            break
    if detected_crop:
        crop_results = []
        for doc in results:
            if doc.metadata.get("folder") == detected_crop:
                crop_results.append(doc)
        if len(crop_results) > 0:
            return crop_results[:5]
    return results[:5]

if __name__ == "__main__":

    if os.path.exists("chroma_db"):

        choice = input(
            "\nExisting Vector Database found.\n"
            "Rebuild it? (y/n): "
        ).strip().lower()

        if choice == "y":

            import shutil

            shutil.rmtree("chroma_db")

            print("\nOld Vector Database deleted.")

            print("\nCreating new Vector Database...\n")

            documents = load_documents()

            print(f"\nTotal Pages Loaded: {len(documents)}")

            chunks = split_documents(documents)

            print(f"Total Chunks Created: {len(chunks)}")

            create_vector_database(chunks)

        else:

            print("\nUsing existing Vector Database.\n")

    else:

        print("\nNo Vector Database found.")

        print("\nCreating Vector Database...\n")

        documents = load_documents()

        print(f"\nTotal Pages Loaded: {len(documents)}")

        chunks = split_documents(documents)

        print(f"Total Chunks Created: {len(chunks)}")

        create_vector_database(chunks)

    query = input("\nAsk a farming question: ")

    results = search_knowledge_base(query)

    print("\nTop Results:\n")

    for i, doc in enumerate(results, 1):
        print(f"Result {i}")
        print("-" * 50)
        print("Folder :", doc.metadata.get("folder"))
        print("Source :", doc.metadata.get("source"))
        print()
        print(doc.page_content[:1000])
        print()