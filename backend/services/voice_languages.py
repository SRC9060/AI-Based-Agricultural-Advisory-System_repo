VOICE_LANGUAGE_CODES = {
    "en": "en-IN",
    "hi": "hi-IN",
    "te": "te-IN",
    "kn": "kn-IN",
    "ta": "ta-IN",
    "ml": "ml-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
}

VOICE_LANGUAGE_NAMES = {
    "english": "en",
    "hindi": "hi",
    "telugu": "te",
    "kannada": "kn",
    "tamil": "ta",
    "malayalam": "ml",
    "marathi": "mr",
    "gujarati": "gu",
}


def get_voice_language_code(language: str, default: str = "en-IN") -> str:
    """Return a supported Sarvam BCP-47 code from an app or BCP-47 code."""
    normalized = (language or "").strip()
    if normalized in VOICE_LANGUAGE_CODES.values():
        return normalized
    app_code = VOICE_LANGUAGE_NAMES.get(
        normalized.lower(),
        normalized.lower(),
    )
    return VOICE_LANGUAGE_CODES.get(app_code, default)
