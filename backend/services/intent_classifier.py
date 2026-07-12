from transformers import pipeline

classifier = pipeline(
    "zero-shot-classification",
    model="valhalla/distilbart-mnli-12-1"
)

labels = [
    "Crop Information",
    "Disease Detection",
    "Pest Management",
    "Weather",
    "Government Schemes",
    "Market Prices",
    "Fertilizer Recommendation"
]


def classify_intent(text):
    result = classifier(text, labels)
    return result["labels"][0]


if __name__ == "__main__":
    text = input("Enter farmer query: ")

    intent = classify_intent(text)

    print("Predicted Intent:", intent)