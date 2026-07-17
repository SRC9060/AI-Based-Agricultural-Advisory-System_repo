from transformers import pipeline

ner = pipeline(
    "ner",
    model="dslim/bert-base-NER",
    aggregation_strategy="simple"
)

def extract_entities(text):
    results = ner(text)
    entities = []
    for entity in results:
        entities.append({
            "entity_group": str(entity.get("entity_group", "")),
            "word": str(entity.get("word", "")),
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