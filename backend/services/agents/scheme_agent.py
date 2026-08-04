from services.knowledge_base import search_government_schemes
from services.llm import generate_llm_response
from services.llm_dashboard import generate_scheme_titles


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

    # Import here to avoid coupling agent initialization to the general RAG
    # pipeline while still sharing its offline extractive fallback.
    from services.rag_pipeline import _local_extractive_response

    answer = generate_llm_response(
        query,
        context,
        fallback=lambda: _local_extractive_response(query, results),
    )

    return answer


if __name__ == "__main__":

    query = input("Ask a Government Scheme question: ")

    response = scheme_agent(query)

    print("\nAI Response:\n")
    print(response)

def scheme_titles_agent(query):

    results = search_government_schemes(query)

    if not results:
        return ""

    context = ""

    for doc in results:
        context += doc.page_content + "\n\n"

    return generate_scheme_titles(query, context)
