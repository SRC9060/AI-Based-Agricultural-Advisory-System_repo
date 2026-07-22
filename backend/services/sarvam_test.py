from sarvamai import SarvamAI
from config import Config

client = SarvamAI(
    api_subscription_key=Config.SARVAM_API_KEY
)
print("Connected to Sarvam AI Successfully!")