from sarvamai import SarvamAI
from config import Config

client = SarvamAI(
    api_subscription_key=Config.SARVAM_API_KEY
)


def generate_scheme_titles(question, context):

    response = client.chat.completions(
        model="sarvam-105b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an agricultural expert helping Indian farmers. "
                    "Answer ONLY using the provided context. "

                    "Return ONLY the TOP 5 most relevant government scheme names.\n"

                    "Rules:\n"
                    "- One scheme name per line.\n"
                    "- No explanation.\n"
                    "- No numbering.\n"
                    "- No bullet points.\n"
                    "- No markdown.\n"
                    "- No extra text.\n"

                    "If no scheme is found, reply exactly: "
                    "'I don't have enough information in the knowledge base.'"
                )
            },
            {
                "role": "user",
                "content": f"""
Context:
{context}

Question:
{question}
"""
            }
        ],
        reasoning_effort=None,
        max_tokens=100,
    )

    return response.choices[0].message.content.strip()