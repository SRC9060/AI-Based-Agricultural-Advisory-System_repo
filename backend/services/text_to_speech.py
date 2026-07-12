import os
from dotenv import load_dotenv
from sarvamai import SarvamAI
from sarvamai.play import save

load_dotenv()

client = SarvamAI(
    api_subscription_key=os.getenv("SARVAM_API_KEY")
)


def text_to_speech(text, language="en"):
    language_map = {
        "en": "en-IN",
        "hi": "hi-IN",
        "te": "te-IN",
        "kn": "kn-IN",
    }

    target_language = language_map.get(language, "en-IN")

    audio = client.text_to_speech.convert(
        text=text,
        target_language_code=target_language,
        model="bulbul:v3",
        speaker="priya"
    )

    output_path = os.path.join("static", "answer.wav")

    os.makedirs("static", exist_ok=True)

    save(audio, output_path)

    return output_path