from deep_translator import GoogleTranslator


def translate_to_english(text):
    return GoogleTranslator(
        source="auto",
        target="en"
    ).translate(text)


def translate_from_english(text, target_language):
    return GoogleTranslator(
        source="en",
        target=target_language
    ).translate(text)