from services.rag_pipeline import generate_response


def pest_agent(query):
    """
    Handles pest and disease related questions using the RAG pipeline.
    """
    return generate_response(query)


if __name__ == "__main__":
    query = input("Ask a pest or disease question: ")

    response = pest_agent(query)

    print("\nResponse:\n")
    print(response)