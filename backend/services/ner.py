from transformers import pipeline

# Load Hugging Face NER model
ner = pipeline(
    "ner",
    model="dslim/bert-base-NER",
    aggregation_strategy="simple",
    # This public model must not use a stale local Hugging Face login token.
    token=False,
)

# Ignore words that are often incorrectly detected as person names
IGNORE_WORDS = {
    "pm",
    "kisan",
    "pm-kisan",
    "kcc",
    "pmfby",
    "yojana",
    "scheme"
}


def extract_entities(text):
    """
    Extract named entities from user query.
    Removes false positives for agricultural/government scheme terms.
    """

    results = ner(text)

    entities = []

    for entity in results:

        word = entity.get("word", "")
        cleaned_word = word.replace("##", "").strip().lower()

        # Ignore false positives
        if cleaned_word in IGNORE_WORDS:
            continue

        entities.append({
            "entity_group": str(entity.get("entity_group", "")),
            "word": str(word),
            "score": float(entity.get("score", 0.0)),
            "start": int(entity.get("start", 0)),
            "end": int(entity.get("end", 0))
        })

    return entities


if __name__ == "__main__":

    text = input("Enter farmer query: ")

    result = extract_entities(text)

    print("\nNamed Entities:\n")

    if result:
        for entity in result:
            print(entity)
    else:
        print("No entities found.")
