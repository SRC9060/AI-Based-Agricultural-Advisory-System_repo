CROPS = [
    "tomato",
    "rice",
    "cotton",
    "maize",
    "chilli",
    "wheat",
    "potato",
    "onion"
]

DISEASES = [
    "late blight",
    "early blight",
    "leaf curl",
    "bacterial spot",
    "root rot",
    "wilt"
]

PESTS = [
    "aphids",
    "whiteflies",
    "armyworm",
    "stem borer",
    "thrips",
    "fruit borer"
]

FERTILIZERS = [
    "urea",
    "dap",
    "npk"
]

SCHEMES = [
    "pm kisan",
    "pm-kisan",
    "pmfby",
    "crop insurance",
    "soil health card"
]

IRRIGATION = [
    "drip irrigation",
    "sprinkler irrigation"
]

SOIL = [
    "soil testing",
    "soil test",
    "ph",
    "soil health"
]

MARKET = [
    "rice price",
    "tomato price",
    "market price"
]

WEATHER = [
    "rainfall",
    "temperature",
    "weather"
]

FAQS = [
    "crop disease",
    "fertilizer",
    "government scheme"
]


def extract_entities(text):
    text = text.lower()

    entities = {
        "crop": [],
        "disease": [],
        "pest": [],
        "fertilizer": [],
        "scheme": [],
        "irrigation": [],
        "soil": [],
        "market": [],
        "weather": [],
        "faq": []
    }

    for crop in CROPS:
        if crop in text:
            entities["crop"].append(crop)

    for disease in DISEASES:
        if disease in text:
            entities["disease"].append(disease)

    for pest in PESTS:
        if pest in text:
            entities["pest"].append(pest)

    for fertilizer in FERTILIZERS:
        if fertilizer in text:
            entities["fertilizer"].append(fertilizer)

    for scheme in SCHEMES:
        if scheme in text:
            entities["scheme"].append(scheme)

    for irrigation in IRRIGATION:
        if irrigation in text:
            entities["irrigation"].append(irrigation)

    for soil in SOIL:
        if soil in text:
            entities["soil"].append(soil)

    for market in MARKET:
        if market in text:
            entities["market"].append(market)

    for weather in WEATHER:
        if weather in text:
            entities["weather"].append(weather)

    for faq in FAQS:
        if faq in text:
            entities["faq"].append(faq)

    return entities


if __name__ == "__main__":
    text = input("Enter farmer query: ")

    entities = extract_entities(text)

    print("\nDetected Entities:")
    print(entities)