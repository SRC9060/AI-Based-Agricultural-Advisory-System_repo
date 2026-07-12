from services.language_detection import detect_language
from services.translation import (
    translate_to_english,
    translate_from_english
)
from services.intent_classifier import classify_intent
from services.ner import extract_entities
from services.knowledge_service import get_information
from services.sarvam_service import generate_response


def process_query(text, target_language="en"):

    # Prevent empty input from crashing the AI pipeline
    if not text or not text.strip():
        return {
            "original_query": "",
            "language": "en",
            "translated_text": "",
            "intent": "Unknown",
            "entities": {},
            "answer": "I couldn't understand your speech. Please try speaking again."
        }

    # Step 1: Detect Language
    language = detect_language(text)

    # Step 2: Translate to English
    translated_text = translate_to_english(text)

    # Prevent empty translation from crashing
    if not translated_text or not translated_text.strip():
        return {
            "original_query": text,
            "language": language,
            "translated_text": "",
            "intent": "Unknown",
            "entities": {},
            "answer": "I couldn't understand your speech. Please try speaking again."
        }

    # Step 3: Classify Intent
    intent = classify_intent(translated_text)

    # Step 4: Extract Entities
    entities = extract_entities(translated_text)

    # Step 5: Retrieve Knowledge
    knowledge = get_information(entities)

    # Step 6: Generate AI Response
    answer = generate_response(
        translated_text,
        knowledge
    )

    # Step 7: Translate answer to selected language
    if target_language != "en":
        answer = translate_from_english(
            answer,
            target_language
        )

    return {
        "original_query": text,
        "language": language,
        "translated_text": translated_text,
        "intent": intent,
        "entities": entities,
        "answer": answer
    }

if __name__ == "__main__":
    query = input("Enter farmer query: ")
    result = process_query(query)
    print(result)