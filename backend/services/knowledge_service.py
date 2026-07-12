import json
import os

BASE_PATH = os.path.join(os.path.dirname(__file__), "..", "knowledge_base")


def load_json(folder, filename):
    file_path = os.path.join(BASE_PATH, folder, filename)

    if not os.path.exists(file_path):
        return None

    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


# -------------------- CROPS --------------------

def get_crop_info(crop_name):
    filename = crop_name.lower() + ".json"
    return load_json("crops", filename)


# -------------------- DISEASES --------------------

def get_disease_info(disease_name):
    filename = disease_name.lower().replace(" ", "_") + ".json"
    return load_json("diseases", filename)


# -------------------- PESTS --------------------

def get_pest_info(pest_name):
    filename = pest_name.lower().replace(" ", "_") + ".json"
    return load_json("pests", filename)


# -------------------- FERTILIZERS --------------------

def get_fertilizer_info(name):
    filename = name.lower().replace(" ", "_") + ".json"
    return load_json("fertilizers", filename)


# -------------------- GOVERNMENT SCHEMES --------------------

def get_scheme_info(name):
    filename = name.lower().replace(" ", "_") + ".json"
    return load_json("government_schemes", filename)


# -------------------- IRRIGATION --------------------

def get_irrigation_info(name):
    filename = name.lower().replace(" ", "_") + ".json"
    return load_json("irrigation", filename)


# -------------------- SOIL --------------------

def get_soil_info(name):
    filename = name.lower().replace(" ", "_") + ".json"
    return load_json("soil_health", filename)


# -------------------- MARKET --------------------

def get_market_info(name):
    filename = name.lower().replace(" ", "_") + ".json"
    return load_json("market_prices", filename)


# -------------------- WEATHER --------------------

def get_weather_info(name):
    filename = name.lower().replace(" ", "_") + ".json"
    return load_json("weather", filename)


# -------------------- FAQ --------------------

def get_faq_info(name):
    filename = name.lower().replace(" ", "_") + ".json"
    return load_json("farmer_faqs", filename)


# -------------------- MAIN FUNCTION --------------------

def get_information(entities):

    response = {}

    if entities["crop"]:
        response["crop"] = get_crop_info(entities["crop"][0])

    if entities["disease"]:
        response["disease"] = get_disease_info(entities["disease"][0])

    if entities["pest"]:
        response["pest"] = get_pest_info(entities["pest"][0])

    if entities["fertilizer"]:
        response["fertilizer"] = get_fertilizer_info(
            entities["fertilizer"][0]
        )

    if entities["scheme"]:
        response["scheme"] = get_scheme_info(
            entities["scheme"][0]
        )

    if entities["irrigation"]:
        response["irrigation"] = get_irrigation_info(
            entities["irrigation"][0]
        )

    if entities["soil"]:
        response["soil"] = get_soil_info(
            entities["soil"][0]
        )

    if entities["market"]:
        response["market"] = get_market_info(
            entities["market"][0]
        )

    if entities["weather"]:
        response["weather"] = get_weather_info(
            entities["weather"][0]
        )

    if entities["faq"]:
        response["faq"] = get_faq_info(
            entities["faq"][0]
        )

    return response


if __name__ == "__main__":

    sample = {
        "crop": ["tomato"],
        "disease": ["late blight"],
        "pest": ["aphids"],
        "fertilizer": ["urea"],
        "scheme": ["pm_kisan"],
        "irrigation": ["drip_irrigation"],
        "soil": ["soil_testing"],
        "market": ["rice_price"],
        "weather": ["rainfall"],
        "faq": ["fertilizer_faq"]
    }

    print(get_information(sample))