import re
from langdetect import detect, LangDetectException


def detect_language(text):

    text = text.strip()

    if not text:
        return "en"

    # Kannada
    if re.search(r'[\u0C80-\u0CFF]', text):
        return "kn"

    # Hindi
    if re.search(r'[\u0900-\u097F]', text):
        return "hi"

    # Tamil
    if re.search(r'[\u0B80-\u0BFF]', text):
        return "ta"

    # Telugu
    if re.search(r'[\u0C00-\u0C7F]', text):
        return "te"

    # Malayalam
    if re.search(r'[\u0D00-\u0D7F]', text):
        return "ml"

    # Gujarati
    if re.search(r'[\u0A80-\u0AFF]', text):
        return "gu"

    # English (ASCII text)
    if text.isascii():
        return "en"

    try:
        language = detect(text)

        supported_languages = {
            "en", "hi", "kn", "ta", "te", "ml",
            "mr", "gu", "bn", "pa", "or",
            "as", "ur", "ne"
        }

        if language in supported_languages:
            return language

        return "en"

    except LangDetectException:
        return "en"


if __name__ == "__main__":
    text = input("Enter text: ")
    print("Detected Language:", detect_language(text))
