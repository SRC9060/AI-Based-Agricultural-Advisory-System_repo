import os
from dotenv import load_dotenv
from sarvamai import SarvamAI

load_dotenv()
client = SarvamAI(
    api_subscription_key=os.getenv("SARVAM_API_KEY")
)
print("Connected to Sarvam AI Successfully!")