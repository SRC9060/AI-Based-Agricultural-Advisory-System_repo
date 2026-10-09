from dotenv import load_dotenv
load_dotenv()
import os
import secrets


class Config:
    SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    # The configured classroom OpenAI project currently exposes GPT-3.5.
    # OPENAI_MODEL can override this when newer model access is granted.
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
    HF_TOKEN = os.getenv("HF_TOKEN")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    AGMARKNET_API_KEY = os.getenv("AGMARKNET_API_KEY")
    AGMARKNET_BASE_URL = os.getenv("AGMARKNET_BASE_URL")
    # In production, set AUTH_SECRET_KEY to a long random value shared by every
    # backend instance. A random process-local key is safe for local development
    # and deliberately invalidates sessions whenever the backend restarts.
    AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY") or secrets.token_urlsafe(48)
    AUTH_TOKEN_TTL_SECONDS = int(os.getenv("AUTH_TOKEN_TTL_SECONDS", "86400"))
    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002,https://ai-based-agricultural-advisory-syst-liard.vercel.app",
        ).split(",")
        if origin.strip()
    ]
