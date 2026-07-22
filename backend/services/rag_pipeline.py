from services.knowledge_base import search_knowledge_base
from services.llm import generate_llm_response

def generate_response(query):
    results = search_knowledge_base(query)
    context = ""
    for doc in results:
        context += doc.page_content + "\n\n"
    answer = generate_llm_response(query, context)
    return answer
if __name__ == "__main__":
    query = input("Ask a farming question: ")
    answer = generate_response(query)
    print("\nAI Answer:\n")
    print(answer)