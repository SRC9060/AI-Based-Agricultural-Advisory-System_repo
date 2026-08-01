import os
import base64
import asyncio
import re
import tempfile
from sarvamai import SarvamAI
from config import Config

client = SarvamAI(
    api_subscription_key=Config.SARVAM_API_KEY
)

EDGE_TTS_VOICES = {
    "en-IN": "en-IN-NeerjaNeural",
    "hi-IN": "hi-IN-SwaraNeural",
    "te-IN": "te-IN-ShrutiNeural",
    "kn-IN": "kn-IN-SapnaNeural",
    "ta-IN": "ta-IN-PallaviNeural",
    "ml-IN": "ml-IN-SobhanaNeural",
    "mr-IN": "mr-IN-AarohiNeural",
    "gu-IN": "gu-IN-DhwaniNeural",
}


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


def _split_for_tts(text, max_characters=2400):
    """Split long advice at sentence boundaries for Bulbul v3's REST limit."""
    normalized = " ".join(text.split())
    if len(normalized) <= max_characters:
        return [normalized]

    sentences = re.split(r"(?<=[.!?।])\s+", normalized)
    chunks = []
    current = ""

    for sentence in sentences:
        remaining = sentence
        while len(remaining) > max_characters:
            split_at = remaining.rfind(" ", 0, max_characters + 1)
            if split_at <= 0:
                split_at = max_characters
            piece = remaining[:split_at].strip()
            if current:
                chunks.append(current)
                current = ""
            if piece:
                chunks.append(piece)
            remaining = remaining[split_at:].strip()

        candidate = f"{current} {remaining}".strip()
        if current and len(candidate) > max_characters:
            chunks.append(current)
            current = remaining
        else:
            current = candidate

    if current:
        chunks.append(current)

    return chunks


def text_to_speech(text, language="en-IN"):
    sarvam_error = None
    try:
        audio_chunks = []
        request_ids = []

        for text_chunk in _split_for_tts(text):
            response = client.text_to_speech.convert(
                text=text_chunk,
                target_language_code=language,
                model="bulbul:v3",
                speaker="shubh",
                pace=0.9,
            )
            audio_chunks.extend(response.audios)
            if getattr(response, "request_id", None):
                request_ids.append(response.request_id)

        audio_bytes = _combine_wav_chunks(audio_chunks)
        os.makedirs("output_audio", exist_ok=True)
        with tempfile.NamedTemporaryFile(
            mode="wb",
            delete=False,
            suffix=".wav",
            prefix="tts-",
            dir="output_audio",
        ) as audio_file:
            audio_file.write(audio_bytes)
            output_file = audio_file.name
        return {
            "audio_file": output_file,
            "request_id": request_ids[-1] if request_ids else None,
            "language_code": language,
            "model": "bulbul:v3",
            "engine": "sarvam",
            "media_type": "audio/wav",
            "filename": "speech.wav",
        }
    except Exception as e:
        sarvam_error = str(e)
        print("Sarvam TTS unavailable; trying multilingual fallback:", e)

    try:
        # Quota-safe fallback for demos and temporary Sarvam outages. Edge TTS
        # provides an explicit Indian voice for each of the eight languages.
        import edge_tts

        os.makedirs("output_audio", exist_ok=True)
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".mp3",
            prefix="tts-fallback-",
            dir="output_audio",
        ) as audio_file:
            output_file = audio_file.name

        voice = EDGE_TTS_VOICES[language]
        asyncio.run(
            edge_tts.Communicate(
                text=text,
                voice=voice,
                rate="-10%",
            ).save(output_file)
        )

        return {
            "audio_file": output_file,
            "request_id": None,
            "language_code": language,
            "model": "edge-tts",
            "engine": "edge-tts",
            "media_type": "audio/mpeg",
            "filename": "speech.mp3",
        }
    except Exception as fallback_error:
        return {
            "error": (
                f"Sarvam TTS failed: {sarvam_error}. "
                f"Multilingual fallback failed: {fallback_error}"
            )
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
