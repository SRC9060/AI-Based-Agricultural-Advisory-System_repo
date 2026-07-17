from services.rag_pipeline import generate_response

def crop_agent(query):
    """
    Handles crop advisory questions using the RAG pipeline.
    """
    return generate_response(query)

if __name__ == "__main__":
    query = input("Ask a crop question: ")
    response = crop_agent(query)

    print("\nResponse:\n")
    print(response)