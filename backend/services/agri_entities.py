import re

def extract_agri_entities(text: str) -> dict:
    if not text:
        return {}
    text_lower = text.lower()
    entities = {}

    crops = [
        "wheat", "rice", "maize", "cotton", "tomato", "potato", "onion",
        "groundnut", "sugarcane", "chilli", "chili", "banana", "cabbage",
        "brinjal", "mustard", "pulses", "gram", "turmeric", "garlic", "ginger",
        "paddy", "mango", "apple", "papaya", "grapes", "guava", "pomegranate",
        "lemon", "soybean", "sunflower", "jute", "tea", "coffee",
        "cluster beans", "bitter gourd", "cauliflower", "ridge gourd",
        "ladies finger", "lady finger", "watermelon", "water melon"
    ]
    diseases = [
        "leaf curl", "yellow rust", "leaf blight", "bacterial blight", "blast",
        "wilt", "leaf spot", "powdery mildew", "downy mildew", "mosaic virus",
        "mosaic", "rot", "root rot", "stem rot", "rust", "canker", "scab",
        "damping off", "dieback", "blossom end rot", "yellowing", "disease",
        "blight", "mildew", "fungus"
    ]
    pests = [
        "whitefly", "aphids", "aphid", "stem borer", "bollworm", "thrips",
        "mites", "mite", "insects", "insect", "caterpillar", "locust",
        "weevil", "grub", "bug", "mealybug", "leaf miner", "fruit borer",
        "cutworm", "pest", "pests"
    ]
    fertilizers = [
        "urea", "dap", "npk", "potash", "compost", "manure", "nitrogen",
        "zinc", "phosphorus", "potassium", "vermicompost", "biofertilizer",
        "fertilizer", "fertiliser"
    ]
    schemes = [
        "pm kisan", "pm-kisan", "pm kisan yojana", "pmfby",
        "pradhan mantri fasal bima yojana", "kisan credit card", "kcc",
        "soil health card", "rkvy", "pkvy", "pmksy"
    ]

    for crop in crops:
        if re.search(r'\b' + re.escape(crop) + r'\b', text_lower):
            entities["crop"] = crop
            break
    for disease in diseases:
        if re.search(r'\b' + re.escape(disease) + r'\b', text_lower) or disease in text_lower:
            entities["disease"] = disease
            break
    for pest in pests:
        if re.search(r'\b' + re.escape(pest) + r'\b', text_lower) or pest in text_lower:
            entities["pest"] = pest
            break
    for fertilizer in fertilizers:
        if re.search(r'\b' + re.escape(fertilizer) + r'\b', text_lower) or fertilizer in text_lower:
            entities["fertilizer"] = fertilizer
            break
    for scheme in schemes:
        if scheme in text_lower:
            entities["government_scheme"] = scheme
            break
    return entities