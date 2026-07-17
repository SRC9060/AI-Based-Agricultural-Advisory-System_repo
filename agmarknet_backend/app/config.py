import os
from pathlib import Path

from dotenv import load_dotenv

dotenv_path = Path(__file__).resolve().parents[2] / ".env"

load_dotenv(dotenv_path=dotenv_path, override=True)

AGMARKNET_API_KEY = os.getenv("AGMARKNET_API_KEY")
AGMARKNET_BASE_URL = os.getenv("AGMARKNET_BASE_URL")