from langdetect import detect, LangDetectException


def detect_language(text):

    if not text or text.strip() == "":
        return "en"

    try:
        return detect(text)

    except LangDetectException:
        return "en"


if __name__ == "__main__":
    text = input("Enter farmer query: ")

    language = detect_language(text)

    print("Detected Language:", language)