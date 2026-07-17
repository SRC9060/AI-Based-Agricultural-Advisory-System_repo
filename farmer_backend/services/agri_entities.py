def extract_agri_entities(text):
    text = text.lower()
    entities = {}
    crops = [
        "wheat", "rice", "maize", "cotton",
        "tomato", "potato", "onion",
        "groundnut", "sugarcane", "chilli"
    ]
    diseases = [
        "yellow rust",
        "leaf blight",
        "blast",
        "wilt",
        "leaf spot",
        "powdery mildew",
        "mosaic"
    ]
    pests = [
        "whitefly",
        "aphids",
        "stem borer",
        "bollworm",
        "thrips",
        "mites",
        "insects"
    ]
    fertilizers = [
        "urea",
        "dap",
        "npk",
        "potash",
        "compost"
    ]
    schemes = [
        "pm-kisan",
        "pmfby",
        "kisan credit card"
    ]
    for crop in crops:
        if crop in text:
            entities["crop"] = crop
            break
    for disease in diseases:
        if disease in text:
            entities["disease"] = disease
            break
    for pest in pests:
        if pest in text:
            entities["pest"] = pest
            break
    for fertilizer in fertilizers:
        if fertilizer in text:
            entities["fertilizer"] = fertilizer
            break
    for scheme in schemes:
        if scheme in text:
            entities["government_scheme"] = scheme
            break
    return entities