import os
from dotenv import load_dotenv
from sarvamai import SarvamAI

load_dotenv()
client = SarvamAI(
    api_subscription_key=os.getenv("SARVAM_API_KEY")
)

def translate_text(text, source_lang, target_lang):
    response = client.text.translate(
        input=text,
        source_language_code=source_lang,
        target_language_code=target_lang,
        model="sarvam-translate:v1"
    )
    return response
if __name__ == "__main__":
    text = input("Enter text: ")
    source = input("Source language (en-IN/hi-IN/kn-IN): ")
    target = input("Target language (en-IN/hi-IN/kn-IN): ")
    result = translate_text(text, source, target)
    print("\nTranslation Result:")
    print("Translated Text :", result.translated_text)
    print("Source Language :", result.source_language_code)
    print("Request ID      :", result.request_id)