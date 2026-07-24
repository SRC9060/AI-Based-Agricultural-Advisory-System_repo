import os
import base64
from sarvamai import SarvamAI
from config import Config

client = SarvamAI(
    api_subscription_key=Config.SARVAM_API_KEY
)

def text_to_speech(text, language="en-IN"):
    try:
        response = client.text_to_speech.convert(
            text=text,
            target_language_code=language,
            speaker="anushka"
        )
        audio_bytes = base64.b64decode(response.audios[0])
        os.makedirs("output_audio", exist_ok=True)
        output_file = "output_audio/output.wav"
        with open(output_file, "wb") as f:
            f.write(audio_bytes)
        return {
            "audio_file": output_file,
            "request_id": response.request_id
        }
    except Exception as e:
        return {
            "error": str(e)
        }

if __name__ == "__main__":
    text = (
        "Yellow rust affects wheat plants. "
        "Spray Propiconazole 25 EC at 0.1 percent concentration. "
        "Use resistant wheat varieties. "
        "Monitor the crop regularly."
    )
    result = text_to_speech(text)
    print(result)