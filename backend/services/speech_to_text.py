import os
import tempfile
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"

_whisper_model = None


def get_whisper_model():
    """
    Load the Whisper model only once.

    The first request may take longer because the model is downloaded
    and loaded into memory.
    """
    global _whisper_model

    if _whisper_model is None:
        print("Loading Whisper base model...")
        _whisper_model = whisper.load_model("base")
        print("Whisper base model loaded successfully.")

    return _whisper_model


def speech_to_text(
    audio_bytes: bytes,
    filename: str,
    content_type: str,
    language_code: str = "unknown",
) -> dict[str, Any]:
    """
    Convert an uploaded audio file into text using Sarvam AI STT.
    """

    if not SARVAM_API_KEY:
        return {
            "success": False,
            "error": "SARVAM_API_KEY is missing from the .env file.",
            "engine": "sarvam",
        }

    if not audio_bytes:
        return {
            "success": False,
            "error": "The uploaded audio file is empty.",
            "engine": "sarvam",
        }

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
    }

    files = {
        "file": (
            filename,
            audio_bytes,
            content_type or "audio/webm",
        ),
    }

    data = {
        "model": "saaras:v3",
        "language_code": language_code,
        "mode": "transcribe",
    }

    try:
        response = requests.post(
            SARVAM_STT_URL,
            headers=headers,
            files=files,
            data=data,
            timeout=60,
        )

        response.raise_for_status()
        result = response.json()

        transcript = result.get("transcript", "").strip()

        if not transcript:
            return {
                "success": False,
                "error": "Sarvam AI did not return a transcript.",
                "engine": "sarvam",
            }

        return {
            "success": True,
            "transcript": transcript,
            "language_code": result.get(
                "language_code",
                language_code,
            ),
            "language_probability": result.get(
                "language_probability",
            ),
            "request_id": result.get("request_id"),
            "engine": "sarvam",
        }

    except requests.Timeout:
        return {
            "success": False,
            "error": "Sarvam AI speech recognition timed out.",
            "engine": "sarvam",
        }

    except requests.RequestException as error:
        error_message: Any = str(error)

        if error.response is not None:
            try:
                error_message = error.response.json()
            except ValueError:
                error_message = error.response.text

        return {
            "success": False,
            "error": f"Sarvam STT request failed: {error_message}",
            "engine": "sarvam",
        }

    except Exception as error:
        return {
            "success": False,
            "error": f"Unexpected Sarvam STT error: {error}",
            "engine": "sarvam",
        }


def whisper_speech_to_text(
    audio_bytes: bytes,
    filename: str,
    language_code: str = "unknown",
) -> dict[str, Any]:
    """
    Convert an uploaded audio file into text using local Whisper.
    """

    if not audio_bytes:
        return {
            "success": False,
            "error": "The uploaded audio file is empty.",
            "engine": "whisper",
        }

    suffix = Path(filename).suffix

    if not suffix:
        suffix = ".webm"

    temporary_path: str | None = None

    language_map = {
        "en": "en",
        "en-IN": "en",
        "hi": "hi",
        "hi-IN": "hi",
        "kn": "kn",
        "kn-IN": "kn",
        "te": "te",
        "te-IN": "te",
        "ta": "ta",
        "ta-IN": "ta",
        "ml": "ml",
        "ml-IN": "ml",
        "mr": "mr",
        "mr-IN": "mr",
        "gu": "gu",
        "gu-IN": "gu",
    }

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temporary_file:
            temporary_file.write(audio_bytes)
            temporary_path = temporary_file.name

        model = get_whisper_model()

        whisper_language = language_map.get(language_code)

        transcribe_options: dict[str, Any] = {
            "task": "transcribe",
            "fp16": False,
        }

        if whisper_language:
            transcribe_options["language"] = whisper_language

        result = model.transcribe(
            temporary_path,
            **transcribe_options,
        )

        transcript = str(
            result.get("text", "")
        ).strip()

        if not transcript:
            return {
                "success": False,
                "error": "Whisper did not detect any speech.",
                "engine": "whisper",
            }

        detected_language = result.get(
            "language",
            whisper_language or "unknown",
        )

        return {
            "success": True,
            "transcript": transcript,
            "language_code": detected_language,
            "engine": "whisper",
        }

    except Exception as error:
        print("Whisper STT error:", error)

        return {
            "success": False,
            "error": f"Whisper STT failed: {error}",
            "engine": "whisper",
        }

    finally:
        if temporary_path:
            try:
                os.remove(temporary_path)
            except OSError as cleanup_error:
                print(
                    "Unable to delete temporary audio file:",
                    cleanup_error,
                )