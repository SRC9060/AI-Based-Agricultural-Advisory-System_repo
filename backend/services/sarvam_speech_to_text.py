import os
import tempfile
from dotenv import load_dotenv
from pydub import AudioSegment
from sarvamai import SarvamAI

load_dotenv()

client = SarvamAI(
    api_subscription_key=os.getenv("SARVAM_API_KEY")
)


def speech_to_text(audio_file_path, language):

    language_map = {
        "en": "en-IN",
        "hi": "hi-IN",
        "te": "te-IN"
    }

    # Convert browser audio to WAV
    wav_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    wav_path = wav_file.name
    wav_file.close()

    audio = AudioSegment.from_file(audio_file_path)
    audio.export(wav_path, format="wav")

    response = client.speech_to_text.transcribe(
        file=wav_path,
        model="saarika:v2.5",
        mode="transcribe",
        language_code=language_map.get(language, "en-IN"),
        input_audio_codec="wav"
    )

    os.remove(wav_path)

    return response.transcript