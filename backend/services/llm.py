from sarvamai import SarvamAI
from config import Config
from services.openai_llm import generate_openai_response

client = SarvamAI(
    api_subscription_key=Config.SARVAM_API_KEY
)

def generate_llm_response(question, context, fallback=None):
    """
    Generate a short, farmer-friendly response using only the retrieved context.
    """

    try:
        response = client.chat.completions(
            model="sarvam-105b",
            messages=[
                {
                    "role": "system",
                    "content": (
                    "You are an experienced agricultural expert helping Indian farmers. "

                    "Answer ONLY using the provided information. "

                    "Never use phrases like "
                    "'Based on the context', "
                    "'According to the context', "
                    "'The context mentions', "
                    "'The context states', "
                    "'From the context', "
                    "'The document says', "
                    "'The information says', "
                    "or any similar phrases. "

                    "Start directly with the answer. "

                    "Explain the answer in simple English that farmers can easily understand. "

                    "Write the answer as one natural paragraph. "

                    "Do NOT use headings like Cause, Solution, Prevention, "
                    "Pesticide, Fertilizer, Dosage, or Best Practices. "

                    "Do NOT use Markdown. "
                    "Do NOT use *, **, #, bullet points, numbering, tables, or special symbols. "

                    "Return only plain text. "

                    "Keep the answer between 50 and 70 words. "
                    "Keep it practical, clear, and easy to understand. "
                    "Do not repeat information. "

                    "If the answer is not available in the provided information, reply exactly: "
                    "'I don't have enough information in the knowledge base.'"
                    ),
                },
                {
                    "role": "user",
                    "content": f"""
Context:
{context}

Question:
{question}
"""
                },
            ],
            reasoning_effort=None,
            max_tokens=80,
        )
    except Exception as error:
        # Sarvam is the primary provider. If it is unavailable (for example,
        # exhausted credits), use OpenAI before the local extractive fallback.
        print(f"Sarvam chat unavailable: {error}")
        try:
            return generate_openai_response(question, context)
        except Exception as openai_error:
            print(f"OpenAI chat unavailable: {openai_error}")
        if fallback is not None:
            return fallback()
        return (
            "The AI response service is temporarily unavailable. Please try "
            "again later."
        )

    answer = response.choices[0].message.content.strip()

    # Remove markdown symbols if generated
    answer = (
        answer.replace("**", "")
              .replace("*", "")
              .replace("#", "")
    )

    # Remove common unwanted labels if generated
    unwanted_phrases = [
        "Cause:",
        "Solution:",
        "Prevention:",
        "Pesticide/Fertilizer:"
    ]

    for phrase in unwanted_phrases:
        answer = answer.replace(phrase, "")

    # Remove extra spaces
    answer = " ".join(answer.split())

    if answer:
        answer = answer[0].upper() + answer[1:]

    return answer


if __name__ == "__main__":

    question = input("Question: ")

    context = """
Yellow rust is a fungal disease of wheat.
It causes yellow streaks on leaves.
Spray Propiconazole 25 EC at 0.1%.
Use resistant wheat varieties.
Monitor the crop regularly after rainfall.
"""

    answer = generate_llm_response(question, context)

    print("\nAnswer:\n")
    print(answer)

