from transformers import pipeline

classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli"
)

candidate_labels = [
    "disease_query",
    "fertilizer_query",
    "government_scheme_query",
    "weather_query",
    "soil_query",
    "pest_control_query",
    "crop_management_query",
    "market_price_query",
    "irrigation_query",
    "seed_query",
    "harvesting_query",
    "crop_variety_query",
    "organic_farming_query",
    "planting_query",
    "weed_management_query",
    "general_agriculture_query"
]

def classify_intent(text):
    if not text.strip():
        return {
            "intent": "unknown",
            "score": 0.0
        }

    query = text.lower()

    # ---------- Weather ----------
    weather_phrases = [
        "what is the weather",
        "weather today",
        "today weather",
        "today's weather",
        "weather forecast",
        "forecast",
        "temperature in",
        "humidity in",
        "wind speed",
        "rain today",
        "will it rain",
        "weather in"
    ]

    if any(phrase in query for phrase in weather_phrases):
        return {
            "intent": "weather_query",
            "score": 1.0
        }

    # ---------- Government Schemes ----------
    government_keywords = [
        "pm kisan",
        "pm-kisan",
        "kisan credit card",
        "kcc",
        "pmfby",
        "pradhan mantri fasal bima",
        "soil health card",
        "government scheme",
        "subsidy",
        "yojana",
        "scheme"
    ]

    if any(keyword in query for keyword in government_keywords):
        return {
            "intent": "government_scheme_query",
            "score": 1.0
        }

    # ---------- Market ----------
    market_keywords = [
        "market price",
        "mandi",
        "apmc",
        "price today",
        "commodity price"
    ]

    if any(keyword in query for keyword in market_keywords):
        return {
            "intent": "market_price_query",
            "score": 1.0
        }

    # ---------- Zero-shot fallback ----------
    result = classifier(text, candidate_labels)

    return {
        "intent": str(result["labels"][0]),
        "score": float(result["scores"][0])
    }

if __name__ == "__main__":
    text = input("Enter farmer query: ")
    result = classify_intent(text)

    print("\nPredicted Intent:")
    print("Intent :", result["intent"])
    print("Confidence Score :", result["score"])