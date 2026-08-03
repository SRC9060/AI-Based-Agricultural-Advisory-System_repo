from config import Config


_client = None


def _get_client():
    global _client
    if _client is None:
        from openai import OpenAI
        _client = OpenAI(api_key=Config.OPENAI_API_KEY)
    return _client


def generate_openai_response(question, context):
    """Generate a grounded fallback answer with OpenAI Chat Completions."""
    brevity_instruction = (
        " The user requested a brief answer, so use no more than three short "
        "sentences."
        if any(term in question.lower() for term in ("brief", "briefly", "short"))
        else ""
    )
    response = _get_client().chat.completions.create(
        model=Config.OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert agricultural adviser helping Indian farmers. "
                    "Provide practical, actionable advice. Use the supplied local knowledge-base "
                    "context when relevant; if context is missing, use your expert agricultural "
                    "knowledge to answer the farmer's question clearly. "
                    "Address every part of a compound question. Use simple, "
                    "practical language in plain text without Markdown formatting. "
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
