import unittest
from services.intent_classifier import classify_intent
from services.response_quality import calculate_response_quality
from services.router import route_query
from services.voice_languages import VOICE_LANGUAGE_CODES, get_voice_language_code
from services.language_detection import detect_language


class IntentClassifierTests(unittest.TestCase):
    def test_weather_intent_classification(self):
        res = classify_intent("what is the weather today in Mandya?")
        self.assertEqual(res["intent"], "weather_query")
        self.assertEqual(res["score"], 1.0)

    def test_scheme_intent_classification(self):
        res = classify_intent("how to apply for PM Kisan scheme?")
        self.assertEqual(res["intent"], "government_scheme_query")
        self.assertEqual(res["score"], 1.0)

    def test_market_price_intent_classification(self):
        res = classify_intent("what is the mandi price today for paddy?")
        self.assertEqual(res["intent"], "market_price_query")
        self.assertEqual(res["score"], 1.0)

    def test_empty_query_intent(self):
        res = classify_intent("  ")
        self.assertEqual(res["intent"], "unknown")
        self.assertEqual(res["score"], 0.0)


class ResponseQualityTests(unittest.TestCase):
    def test_high_quality_response(self):
        long_response = "PM-KISAN is a central sector scheme with 100% funding from Government of India. Under the scheme, income support of Rs. 6000 per year in three equal installments is provided to eligible farmer families."
        res = calculate_response_quality(0.95, long_response)
        self.assertGreaterEqual(res["quality_score"], 0.80)
        self.assertEqual(res["confidence_level"], "HIGH")
        self.assertFalse(res["needs_human_review"])

    def test_short_response_penalized(self):
        res = calculate_response_quality(0.90, "Short reply.")
        self.assertLess(res["quality_score"], 0.80)

    def test_uncertainty_words_penalized(self):
        res = calculate_response_quality(0.85, "Maybe you could try applying for PM Kisan, but I am not sure about the exact details.")
        self.assertLess(res["quality_score"], 0.80)


class VoiceLanguageTests(unittest.TestCase):
    def test_voice_language_codes_mapping(self):
        self.assertEqual(get_voice_language_code("hi"), "hi-IN")
        self.assertEqual(get_voice_language_code("kn"), "kn-IN")
        self.assertEqual(get_voice_language_code("en"), "en-IN")
        self.assertEqual(get_voice_language_code("unknown"), "en-IN")


class RouterTests(unittest.TestCase):
    def test_route_crop_query(self):
        res = route_query("crop_management_query", query="How to grow rice?")
        self.assertIsNotNone(res)

    def test_route_weather_query(self):
        res = route_query("weather_query", city="Mysuru")
        self.assertIsNotNone(res)

    def test_route_scheme_query(self):
        res = route_query("government_scheme_query", query="PM Kisan eligibility")
        self.assertIsNotNone(res)

    def test_route_unknown_intent(self):
        res = route_query("unknown_intent_type")
        self.assertIn("couldn't identify", res)


class LanguageDetectionTests(unittest.TestCase):
    def test_detect_english(self):
        res = detect_language("What is the best fertilizer for tomato crop?")
        self.assertEqual(res, "en")

    def test_detect_kannada(self):
        res = detect_language("ಟೊಮೆಟೊ ಬೆಳೆಗೆ ಅತ್ಯುತ್ತಮ ಗೊಬ್ಬರ ಯಾವುದು?")
        self.assertEqual(res, "kn")

    def test_detect_hindi(self):
        res = detect_language("टमाटर की फसल के लिए सबसे अच्छा उर्वरक कौन सा है?")
        self.assertEqual(res, "hi")



if __name__ == "__main__":
    unittest.main()
