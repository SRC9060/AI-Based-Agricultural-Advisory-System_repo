from openai import OpenAI

from config import Config


client = OpenAI(api_key=Config.OPENAI_API_KEY)


def generate_openai_response(question, context):
    """Generate a grounded fallback answer with OpenAI Chat Completions."""
    brevity_instruction = (
        " The user requested a brief answer, so use no more than three short "
        "sentences."
        if any(term in question.lower() for term in ("brief", "briefly", "short"))
        else ""
    )
    response = client.chat.completions.create(
        model=Config.OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an agricultural adviser helping Indian farmers. "
                    "Answer only from the supplied local knowledge-base context. "
                    "If the context is insufficient, clearly say what is missing. "
                    "Address every part of a compound question. Use simple, "
                    "practical English and plain text. Cite supporting documents "
                    "inline using their Source labels. Never invent a diagnosis, "
                    "scheme eligibility, dosage, deadline, or compensation amount. "
                    "Remind the farmer to verify disease diagnosis and pesticide "
                    "choice with a local agriculture officer before spraying."
                    + brevity_instruction
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Local knowledge-base context:\n{context}\n\n"
                    f"Farmer's question:\n{question}"
                ),
            },
        ],
        max_tokens=500,
        temperature=0.2,
    )

    answer = (response.choices[0].message.content or "").strip()
    if not answer:
        raise ValueError("OpenAI returned an empty response.")
    return answer
