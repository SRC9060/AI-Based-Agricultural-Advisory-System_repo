from __future__ import annotations


WEATHER_LABELS = {
    "en": {
        "title": "Current weather in {city}.",
        "temperature": "Temperature",
        "humidity": "Humidity",
        "weather": "Weather",
        "wind": "Wind speed",
        "wind_unit": "m/s",
    },
    "hi": {
        "title": "{city} में वर्तमान मौसम।",
        "temperature": "तापमान",
        "humidity": "आर्द्रता",
        "weather": "मौसम",
        "wind": "हवा की गति",
        "wind_unit": "मी/से",
    },
    "kn": {
        "title": "{city} ನಗರದ ಪ್ರಸ್ತುತ ಹವಾಮಾನ.",
        "temperature": "ತಾಪಮಾನ",
        "humidity": "ಆರ್ದ್ರತೆ",
        "weather": "ಹವಾಮಾನ",
        "wind": "ಗಾಳಿಯ ವೇಗ",
        "wind_unit": "ಮೀ/ಸೆ",
    },
    "te": {
        "title": "{city}లో ప్రస్తుత వాతావరణం.",
        "temperature": "ఉష్ణోగ్రత",
        "humidity": "తేమ",
        "weather": "వాతావరణం",
        "wind": "గాలి వేగం",
        "wind_unit": "మీ/సె",
    },
    "ta": {
        "title": "{city} நகரின் தற்போதைய வானிலை.",
        "temperature": "வெப்பநிலை",
        "humidity": "ஈரப்பதம்",
        "weather": "வானிலை",
        "wind": "காற்றின் வேகம்",
        "wind_unit": "மீ/வி",
    },
    "ml": {
        "title": "{city}യിലെ നിലവിലെ കാലാവസ്ഥ.",
        "temperature": "താപനില",
        "humidity": "ആർദ്രത",
        "weather": "കാലാവസ്ഥ",
        "wind": "കാറ്റിന്റെ വേഗം",
        "wind_unit": "മീ/സെ",
    },
    "mr": {
        "title": "{city} मधील सध्याचे हवामान.",
        "temperature": "तापमान",
        "humidity": "आर्द्रता",
        "weather": "हवामान",
        "wind": "वाऱ्याचा वेग",
        "wind_unit": "मी/से",
    },
    "gu": {
        "title": "{city}નું વર્તમાન હવામાન.",
        "temperature": "તાપમાન",
        "humidity": "ભેજ",
        "weather": "હવામાન",
        "wind": "પવનની ગતિ",
        "wind_unit": "મી/સે",
    },
}


CONDITIONS = {
    "hi": {
        "clear sky": "साफ़ आसमान",
        "few clouds": "कुछ बादल",
        "scattered clouds": "छिटपुट बादल",
        "broken clouds": "आंशिक बादल",
        "overcast clouds": "बादल छाए हुए",
        "light rain": "हल्की बारिश",
        "moderate rain": "मध्यम बारिश",
        "heavy intensity rain": "तेज़ बारिश",
        "drizzle": "बूंदाबांदी",
        "mist": "धुंध",
        "haze": "हल्का कोहरा",
        "thunderstorm": "आंधी-तूफान",
    },
    "kn": {
        "clear sky": "ಸ್ಪಷ್ಟ ಆಕಾಶ",
        "few clouds": "ಸ್ವಲ್ಪ ಮೋಡ",
        "scattered clouds": "ಚದುರಿದ ಮೋಡಗಳು",
        "broken clouds": "ಭಾಗಶಃ ಮೋಡ",
        "overcast clouds": "ಮೋಡ ಕವಿದ ವಾತಾವರಣ",
        "light rain": "ಹಗುರ ಮಳೆ",
        "moderate rain": "ಮಧ್ಯಮ ಮಳೆ",
        "heavy intensity rain": "ಭಾರಿ ಮಳೆ",
        "drizzle": "ತುಂತುರು ಮಳೆ",
        "mist": "ಮಂಜು",
        "haze": "ಮಬ್ಬು",
        "thunderstorm": "ಗುಡುಗು ಸಹಿತ ಮಳೆ",
    },
    "te": {
        "clear sky": "నిర్మలమైన ఆకాశం",
        "few clouds": "కొద్దిగా మేఘాలు",
        "scattered clouds": "చెల్లాచెదురు మేఘాలు",
        "broken clouds": "పాక్షిక మేఘాలు",
        "overcast clouds": "మేఘావృతం",
        "light rain": "తేలికపాటి వర్షం",
        "moderate rain": "మోస్తరు వర్షం",
        "heavy intensity rain": "భారీ వర్షం",
        "drizzle": "చినుకులు",
        "mist": "పొగమంచు",
        "haze": "మసక",
        "thunderstorm": "ఉరుములతో కూడిన వర్షం",
    },
    "ta": {
        "clear sky": "தெளிவான வானம்",
        "few clouds": "சில மேகங்கள்",
        "scattered clouds": "சிதறிய மேகங்கள்",
        "broken clouds": "பகுதி மேகமூட்டம்",
        "overcast clouds": "மேகமூட்டம்",
        "light rain": "லேசான மழை",
        "moderate rain": "மிதமான மழை",
        "heavy intensity rain": "கனமழை",
        "drizzle": "தூறல்",
        "mist": "மூடுபனி",
        "haze": "மங்கலான வானிலை",
        "thunderstorm": "இடியுடன் கூடிய மழை",
    },
    "ml": {
        "clear sky": "തെളിഞ്ഞ ആകാശം",
        "few clouds": "കുറച്ച് മേഘങ്ങൾ",
        "scattered clouds": "ചിതറിയ മേഘങ്ങൾ",
        "broken clouds": "ഭാഗിക മേഘാവൃതം",
        "overcast clouds": "മേഘാവൃതം",
        "light rain": "നേരിയ മഴ",
        "moderate rain": "മിതമായ മഴ",
        "heavy intensity rain": "കനത്ത മഴ",
        "drizzle": "ചാറ്റൽ മഴ",
        "mist": "മൂടൽമഞ്ഞ്",
        "haze": "മങ്ങൽ",
        "thunderstorm": "ഇടിയോടുകൂടിയ മഴ",
    },
    "mr": {
        "clear sky": "निरभ्र आकाश",
        "few clouds": "थोडे ढग",
        "scattered clouds": "विखुरलेले ढग",
        "broken clouds": "अंशतः ढगाळ",
        "overcast clouds": "ढगाळ वातावरण",
        "light rain": "हलका पाऊस",
        "moderate rain": "मध्यम पाऊस",
        "heavy intensity rain": "मुसळधार पाऊस",
        "drizzle": "रिमझिम पाऊस",
        "mist": "धुके",
        "haze": "धूसर वातावरण",
        "thunderstorm": "मेघगर्जनेसह पाऊस",
    },
    "gu": {
        "clear sky": "સ્વચ્છ આકાશ",
        "few clouds": "થોડાં વાદળો",
        "scattered clouds": "છૂટાછવાયા વાદળો",
        "broken clouds": "આંશિક વાદળછાયું",
        "overcast clouds": "વાદળછાયું વાતાવરણ",
        "light rain": "હળવો વરસાદ",
        "moderate rain": "મધ્યમ વરસાદ",
        "heavy intensity rain": "ભારે વરસાદ",
        "drizzle": "ઝરમર વરસાદ",
        "mist": "ધુમ્મસ",
        "haze": "ધૂંધળું વાતાવરણ",
        "thunderstorm": "ગાજવીજ સાથે વરસાદ",
    },
}


def format_current_weather(weather: dict, language: str) -> str:
    lang_code = (language or "en").split("-")[0].lower()
    app_language = lang_code if lang_code in WEATHER_LABELS else "en"
    labels = WEATHER_LABELS[app_language]
    condition = str(weather["weather"])
    localized_condition = CONDITIONS.get(app_language, {}).get(
        condition.lower(),
        condition,
    )
    return "\n".join(
        (
            labels["title"].format(city=weather["city"]),
            f'{labels["temperature"]}: {weather["temperature"]}°C.',
            f'{labels["humidity"]}: {weather["humidity"]}%.',
            f'{labels["weather"]}: {localized_condition}.',
            (
                f'{labels["wind"]}: {weather["wind_speed"]} '
                f'{labels["wind_unit"]}.'
            ),
        )
    )
