from dotenv import load_dotenv
load_dotenv(override=True)
import os
class Config:
    SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    # The configured classroom OpenAI project currently exposes GPT-3.5.
    # OPENAI_MODEL can override this when newer model access is granted.
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
    HF_TOKEN = os.getenv("HF_TOKEN")
    AGMARKNET_API_KEY = os.getenv("AGMARKNET_API_KEY")
    AGMARKNET_BASE_URL = os.getenv("AGMARKNET_BASE_URL")
    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ]
