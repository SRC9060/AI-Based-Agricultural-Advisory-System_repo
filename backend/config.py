from dotenv import load_dotenv
load_dotenv(override=True)
import os
class Config:
    SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
    HF_TOKEN = os.getenv("HF_TOKEN")
    AGMARKNET_API_KEY = os.getenv("AGMARKNET_API_KEY")
    AGMARKNET_BASE_URL = os.getenv("AGMARKNET_BASE_URL")
    USERS = {
        "admin@gmail.com": {
            "password": "pass123",
            "name": "Admin"
        },
        "user@gmail.com": {
            "password": "pass123",
            "name": "User"
        }
    }