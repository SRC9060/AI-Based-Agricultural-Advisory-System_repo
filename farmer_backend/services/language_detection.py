from langdetect import detect, LangDetectException

def detect_language(text):
    try:
        return detect(text)
    except LangDetectException:
        return "en"

if __name__ == "__main__":
    text = input("Enter text: ")
    language = detect_language(text)
    print("Detected Language:", language)