from sarvamai import SarvamAI
from config import Config
from dataclasses import dataclass

client = SarvamAI(
    api_subscription_key=Config.SARVAM_API_KEY
)

LANGUAGE_NAMES = {
    "en-IN": "English",
    "hi-IN": "Hindi",
    "te-IN": "Telugu",
    "kn-IN": "Kannada",
    "ta-IN": "Tamil",
    "ml-IN": "Malayalam",
    "mr-IN": "Marathi",
    "gu-IN": "Gujarati",
}

SCRIPT_RANGES = {
    "hi-IN": (0x0900, 0x097F),
    "mr-IN": (0x0900, 0x097F),
    "gu-IN": (0x0A80, 0x0AFF),
    "ta-IN": (0x0B80, 0x0BFF),
    "te-IN": (0x0C00, 0x0C7F),
    "kn-IN": (0x0C80, 0x0CFF),
    "ml-IN": (0x0D00, 0x0D7F),
}


@dataclass
class TranslationResult:
    translated_text: str
    source_language_code: str
    request_id: str | None = None
    used_fallback: bool = False
    error: str | None = None


def _has_expected_script(text: str, target_lang: str) -> bool:
    """Reject a translation returned in a different Indian script."""
    script_range = SCRIPT_RANGES.get(target_lang)
    if script_range is None:
        return True
    start, end = script_range
    return any(start <= ord(character) <= end for character in text)


def _translate_with_openai(text: str, target_lang: str) -> str:
    if not Config.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured")

    from openai import OpenAI

    target_name = LANGUAGE_NAMES.get(target_lang, target_lang)
    response = OpenAI(api_key=Config.OPENAI_API_KEY).chat.completions.create(
        model=Config.OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "Translate the supplied agricultural application text into "
                    f"{target_name} ({target_lang}). Use only the target "
                    "language's writing system for translated words. Preserve "
                    "numbers, units and official "
                    "abbreviations. Translate crop and category names naturally, "
                    "and transliterate place, market and other proper names into "
                    "the target script. Return only the translation."
                ),
            },
            {"role": "user", "content": text},
        ],
        temperature=0,
        max_tokens=800,
    )
    translated = (response.choices[0].message.content or "").strip()
    if not translated:
        raise ValueError("OpenAI returned an empty translation")
    if not _has_expected_script(translated, target_lang):
        raise ValueError(
            f"OpenAI returned text outside the {target_name} script"
        )
    return translated


SYSTEM_FALLBACK_TRANSLATIONS = {
    "kn-IN": {
        "Please tell me the city name to get the weather information.": (
            "ಹವಾಮಾನ ಮಾಹಿತಿ ಪಡೆಯಲು ದಯವಿಟ್ಟು ನಗರ ಅಥವಾ ಜಿಲ್ಲೆಯ ಹೆಸರನ್ನು ತಿಳಿಸಿ."
        ),
    },
    "hi-IN": {
        "Please tell me the city name to get the weather information.": (
            "मौसम की जानकारी पाने के लिए कृपया शहर या जिले का नाम बताएं।"
        ),
    },
    "te-IN": {
        "Please tell me the city name to get the weather information.": (
            "వాతావరణ సమాచారం పొందడానికి దయచేసి నగరం లేదా జిల్లా పేరును చెప్పండి."
        ),
    },
}


LANG_CODE_MAP = {
    "en-IN": "en",
    "hi-IN": "hi",
    "te-IN": "te",
    "kn-IN": "kn",
    "ta-IN": "ta",
    "ml-IN": "ml",
    "mr-IN": "mr",
    "gu-IN": "gu",
}


def _translate_with_google(text: str, source_lang: str, target_lang: str) -> str:
    from deep_translator import GoogleTranslator
    src = LANG_CODE_MAP.get(source_lang, "auto")
    tgt = LANG_CODE_MAP.get(target_lang, target_lang.split("-")[0])
    translated = GoogleTranslator(source=src, target=tgt).translate(text)
    if not translated:
        raise ValueError("GoogleTranslator returned an empty translation")
    return translated


def translate_text(text, source_lang, target_lang):
    """Translate text without allowing a remote outage to crash /chat.

    Returning the original text is a deliberate degraded mode. The multilingual
    LLM can still understand many Indian-language questions, and the farmer gets
    a text response even when Sarvam has no credits or is temporarily offline.
    """
    if source_lang == target_lang:
        return TranslationResult(
            translated_text=text,
            source_language_code=source_lang,
        )

    try:
        response = client.text.translate(
            input=text,
            source_language_code=source_lang,
            target_language_code=target_lang,
            model="sarvam-translate:v1"
        )
        translated_text = response.translated_text
        if not _has_expected_script(translated_text, target_lang):
            target_name = LANGUAGE_NAMES.get(target_lang, target_lang)
            raise ValueError(
                f"Sarvam returned text outside the {target_name} script"
            )
        return TranslationResult(
            translated_text=translated_text,
            source_language_code=getattr(
                response,
                "source_language_code",
                source_lang,
            ),
            request_id=getattr(response, "request_id", None),
        )
    except Exception as error:
        print("Sarvam translation unavailable:", error)
        fallback_message = "not attempted"
        try:
            translated_text = _translate_with_openai(text, target_lang)
            return TranslationResult(
                translated_text=translated_text,
                source_language_code=source_lang,
                used_fallback=True,
                error=str(error),
            )
        except Exception as fallback_error:
            fallback_message = str(fallback_error)
            print(
                "OpenAI translation unavailable; trying GoogleTranslator:",
                fallback_error,
            )

        # Try free GoogleTranslator fallback
        try:
            translated_text = _translate_with_google(text, source_lang, target_lang)
            return TranslationResult(
                translated_text=translated_text,
                source_language_code=source_lang,
                used_fallback=True,
                error=f"Sarvam: {error}; OpenAI: {fallback_message}",
            )
        except Exception as google_error:
            print("Google translation unavailable; checking system dictionary:", google_error)

        # Check local system dictionary for offline fallback
        local_dict = SYSTEM_FALLBACK_TRANSLATIONS.get(target_lang, {})
        fallback_text = local_dict.get(text.strip(), text)

        return TranslationResult(
            translated_text=fallback_text,
            source_language_code=source_lang,
            used_fallback=True,
            error=f"Sarvam: {error}; OpenAI: {fallback_message}",
        )

if __name__ == "__main__":
    text = input("Enter text: ")
    source = input("Source language (en-IN/hi-IN/kn-IN): ")
    target = input("Target language (en-IN/hi-IN/kn-IN): ")
    result = translate_text(text, source, target)
    print("\nTranslation Result:")
    print("Translated Text :", result.translated_text)
    print("Source Language :", result.source_language_code)
    print("Request ID      :", result.request_id)
