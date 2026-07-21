from services.knowledge_base import search_government_schemes
from services.llm import generate_llm_response


def scheme_agent(query):
    """
    Government Scheme Agent using RAG.
    Searches only Government_Schemes documents.
    """

    results = search_government_schemes(query)

    if not results:
        return (
            "Sorry, I couldn't find any information about this government "
            "scheme in the knowledge base."
        )

    context = ""

    for doc in results:
        context += doc.page_content + "\n\n"

    answer = generate_llm_response(query, context)

    return answer


if __name__ == "__main__":

    query = input("Ask a Government Scheme question: ")

    response = scheme_agent(query)

    print("\nAI Response:\n")
    print(response)