_ner = None


def _get_ner():
    global _ner
    if _ner is None:
        try:
            from transformers import pipeline
            _ner = pipeline(
                "ner",
                model="dslim/bert-base-NER",
                aggregation_strategy="simple",
                token=False,
            )
        except Exception:
            _ner = False
    return _ner if _ner is not False else None


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
    ner_model = _get_ner()
    if not ner_model:
        return []

    try:
        results = ner_model(text)
    except Exception:
        return []

    entities = []

    for entity in results:
        word = entity.get("word", "")
        cleaned_word = word.replace("##", "").strip().lower()

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
