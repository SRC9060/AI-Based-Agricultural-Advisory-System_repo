import os
import base64
from sarvamai import SarvamAI
from config import Config

client = SarvamAI(
    api_subscription_key=Config.SARVAM_API_KEY
)


def _combine_wav_chunks(audio_chunks):
    """Join all WAV chunks returned by Sarvam into one playable WAV file."""
    decoded_chunks = [base64.b64decode(chunk) for chunk in audio_chunks]
    if not decoded_chunks:
        raise ValueError("The text-to-speech service returned no audio chunks.")

    combined_audio = decoded_chunks[0]
    for chunk in decoded_chunks[1:]:
        data_position = chunk.find(b"data")
        if data_position == -1:
            raise ValueError("A text-to-speech audio chunk is not a valid WAV file.")
        combined_audio += chunk[data_position + 8 :]

    if len(decoded_chunks) > 1:
        # A WAV header contains both the total file size and PCM data size.
        # Update both values so browsers play every joined chunk, not just one.
        combined_audio = (
            combined_audio[:4]
            + (len(combined_audio) - 8).to_bytes(4, "little")
            + combined_audio[8:]
        )
        data_position = combined_audio.find(b"data")
        if data_position != -1:
            combined_audio = (
                combined_audio[: data_position + 4]
                + (len(combined_audio) - data_position - 8).to_bytes(4, "little")
                + combined_audio[data_position + 8 :]
            )

    return combined_audio


def text_to_speech(text, language="en-IN"):
    try:
        response = client.text_to_speech.convert(
            text=text,
            target_language_code=language,
            speaker="anushka"
        )
        # Long responses are returned in multiple chunks. Saving only the
        # first one made long advice sound like an 8-second recording.
        audio_bytes = _combine_wav_chunks(response.audios)
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
