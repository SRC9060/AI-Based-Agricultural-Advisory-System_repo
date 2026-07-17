import os
from dotenv import load_dotenv
from sarvamai import SarvamAI

load_dotenv()
client = SarvamAI(
    api_subscription_key=os.getenv("SARVAM_API_KEY")
)

def speech_to_text(audio_file_path):
    try:
        with open(audio_file_path, "rb") as audio_file:
            response = client.speech_to_text.transcribe(
                file=audio_file,
                model="saaras:v3",
                mode="transcribe",
                language_code="unknown",
                input_audio_codec="x-m4a"
            )
        return response
    except Exception as e:
        return f"Error: {e}"

if __name__ == "__main__":
    audio_path = input("Enter audio file path: ")
    result = speech_to_text(audio_path)
    print("\nRecognized Text:")
    print(result.transcript)