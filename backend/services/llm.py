import os
import requests
from config import Config
from services.openai_llm import generate_openai_response

_sarvam_client = None


def _get_sarvam_client():
    global _sarvam_client
    if _sarvam_client is None:
        try:
            from sarvamai import SarvamAI
            if Config.SARVAM_API_KEY:
                _sarvam_client = SarvamAI(api_subscription_key=Config.SARVAM_API_KEY)
            else:
                _sarvam_client = False
        except Exception:
            _sarvam_client = False
    return _sarvam_client if _sarvam_client is not False else None


def generate_gemini_response(question, context):
    gemini_key = getattr(Config, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        raise ValueError("GEMINI_API_KEY is not configured")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
    prompt = f"""
You are an experienced, expert agricultural advisor helping Indian farmers.
STRICT DOMAIN RULE: You MUST answer questions related to agriculture, farming, crops (tomato, potato, onion, wheat, rice, cotton, sugarcane, etc.), crop diseases (leaf curl, bacterial blight, powdery mildew, wilt, mosaic virus, blast, rust, rot, etc.), pest control, soil health, fertilizers, weather, market prices, or government schemes. If the question is about non-agricultural topics (such as celebrities, sports, movies, coding, games, or politics), respond ONLY with: 'I am an AI-powered Agricultural Advisory Assistant. I can only answer questions related to farming, crops, soil health, pest management, weather, government schemes, and market prices. Please ask an agriculture-related question.' Do NOT answer non-agricultural questions under any circumstances.

Provide comprehensive, detailed, and practical agricultural advice for the farmer's question.
If the provided context contains relevant details, use them; otherwise, use your expert agricultural knowledge to give helpful, actionable guidance regarding crop management, pest and disease control, soil health, fertilizers, weather, or government schemes.
Explain in simple, friendly, encouraging language with full details, clear step-by-step guidance, crop requirements, proper dosage recommendations, timing, and preventive actions.
Write a complete, detailed response (around 100 to 180 words across 2 to 3 paragraphs).
Do NOT use Markdown formatting, headings, bullet points, asterisks, or special characters. Return only plain text.

Context:
{context}

Question:
{question}
"""
    response = requests.post(
        url,
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=15,
    )
    if response.status_code != 200:
        url_v2 = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}"
        response = requests.post(
            url_v2,
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=15,
        )
    if response.status_code != 200:
        raise ValueError(f"Gemini API error {response.status_code}: {response.text}")
    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


def generate_groq_response(question, context):
    groq_key = getattr(Config, "GROQ_API_KEY", None) or os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise ValueError("GROQ_API_KEY is not configured")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an experienced, expert agricultural advisor helping Indian farmers. "
                    "STRICT DOMAIN RULE: You MUST answer questions related to agriculture, farming, crops (tomato, potato, onion, wheat, rice, cotton, sugarcane, etc.), crop diseases (leaf curl, bacterial blight, powdery mildew, wilt, mosaic virus, blast, rust, rot, etc.), pest control, soil health, fertilizers, weather, market prices, or government schemes. If the question is about non-agricultural topics (such as celebrities, sports, movies, coding, games, or politics), respond ONLY with: 'I am an AI-powered Agricultural Advisory Assistant. I can only answer questions related to farming, crops, soil health, pest management, weather, government schemes, and market prices. Please ask an agriculture-related question.' Do NOT answer non-agricultural questions under any circumstances. "
                    "Explain in simple, friendly, encouraging language with full details, clear step-by-step guidance, crop requirements, proper dosage recommendations, timing, and preventive actions. "
                    "Write a complete, detailed response (around 100 to 180 words across 2 to 3 paragraphs). "
                    "Do NOT use Markdown formatting, headings, bullet points, asterisks, or special characters. Return only plain text."
                ),
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion:\n{question}",
            },
        ],
        "temperature": 0.4,
        "max_tokens": 450,
    }
    response = requests.post(url, headers=headers, json=payload, timeout=15)
    if response.status_code != 200:
        raise ValueError(f"Groq API error {response.status_code}: {response.text}")
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


def generate_llm_response(question, context, fallback=None):
    """
    Generate a short, farmer-friendly response using Groq, Gemini, Sarvam, or OpenAI.
    """
    from dotenv import load_dotenv
    load_dotenv(override=True)

    # 1. Try Groq
    groq_key = os.getenv("GROQ_API_KEY") or getattr(Config, "GROQ_API_KEY", None)
    if groq_key:
        try:
            return generate_groq_response(question, context)
        except Exception as groq_error:
            print(f"Groq chat unavailable: {groq_error}")

    # 2. Try Gemini
    gemini_key = os.getenv("GEMINI_API_KEY") or getattr(Config, "GEMINI_API_KEY", None)
    if gemini_key:
        try:
            return generate_gemini_response(question, context)
        except Exception as gemini_error:
            print(f"Gemini chat unavailable: {gemini_error}")

    # 3. Try Sarvam
    sarvam_client = _get_sarvam_client()
    if sarvam_client:
        try:
            response = sarvam_client.chat.completions(
                model="sarvam-105b",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an experienced, expert agricultural advisor helping Indian farmers. "
                            "Provide comprehensive, detailed, and practical agricultural advice for the farmer's question. "
                            "Explain in simple, friendly, encouraging language with full details, clear step-by-step guidance, crop requirements, proper dosage recommendations, timing, and preventive actions. "
                            "Write a complete, detailed response (around 100 to 180 words across 2 to 3 paragraphs). "
                            "Do NOT use Markdown formatting, headings, bullet points, asterisks, or special characters. Return only plain text."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Context:\n{context}\n\nQuestion:\n{question}",
                    },
                ],
                reasoning_effort=None,
                max_tokens=400,
            )
            answer = response.choices[0].message.content.strip()
            if answer:
                return answer[0].upper() + answer[1:]
        except Exception as error:
            print(f"Sarvam chat unavailable: {error}")

    # 4. Try OpenAI
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
