import type { LanguageCode } from "@/lib/languages";

type WeatherCondition =
  | "clear"
  | "partlyCloudy"
  | "cloudy"
  | "overcast"
  | "lightRain"
  | "rain"
  | "heavyRain"
  | "drizzle"
  | "thunderstorm"
  | "snow"
  | "mist"
  | "haze"
  | "fog"
  | "smoke"
  | "dust"
  | "tornado";

const weatherConditions: Record<
  Exclude<LanguageCode, "en">,
  Record<WeatherCondition, string>
> = {
  hi: {
    clear: "साफ़ आसमान",
    partlyCloudy: "आंशिक बादल",
    cloudy: "बादल छाए हुए",
    overcast: "घने बादल",
    lightRain: "हल्की बारिश",
    rain: "बारिश",
    heavyRain: "भारी बारिश",
    drizzle: "बूंदाबांदी",
    thunderstorm: "गरज के साथ बारिश",
    snow: "बर्फबारी",
    mist: "हल्का कोहरा",
    haze: "धुंध",
    fog: "घना कोहरा",
    smoke: "धुआँ",
    dust: "धूल भरी हवा",
    tornado: "बवंडर",
  },
  te: {
    clear: "స్పష్టమైన ఆకాశం",
    partlyCloudy: "పాక్షికంగా మేఘావృతం",
    cloudy: "మేఘావృతం",
    overcast: "దట్టమైన మేఘాలు",
    lightRain: "తేలికపాటి వర్షం",
    rain: "వర్షం",
    heavyRain: "భారీ వర్షం",
    drizzle: "చినుకులు",
    thunderstorm: "ఉరుములతో కూడిన వర్షం",
    snow: "మంచు వర్షం",
    mist: "పొగమంచు",
    haze: "మసక వాతావరణం",
    fog: "దట్టమైన పొగమంచు",
    smoke: "పొగ",
    dust: "దుమ్ముతో కూడిన గాలి",
    tornado: "సుడిగాలి",
  },
  kn: {
    clear: "ಸ್ಪಷ್ಟ ಆಕಾಶ",
    partlyCloudy: "ಭಾಗಶಃ ಮೋಡ",
    cloudy: "ಮೋಡ ಕವಿದ ವಾತಾವರಣ",
    overcast: "ದಟ್ಟ ಮೋಡ",
    lightRain: "ಲಘು ಮಳೆ",
    rain: "ಮಳೆ",
    heavyRain: "ಭಾರಿ ಮಳೆ",
    drizzle: "ತುಂತುರು ಮಳೆ",
    thunderstorm: "ಗುಡುಗು ಸಹಿತ ಮಳೆ",
    snow: "ಹಿಮಪಾತ",
    mist: "ಮಂಜು",
    haze: "ಮಸುಕಾದ ವಾತಾವರಣ",
    fog: "ದಟ್ಟ ಮಂಜು",
    smoke: "ಹೊಗೆ",
    dust: "ಧೂಳು ತುಂಬಿದ ಗಾಳಿ",
    tornado: "ಸುಂಟರಗಾಳಿ",
  },
  ta: {
    clear: "தெளிவான வானம்",
    partlyCloudy: "ஓரளவு மேகமூட்டம்",
    cloudy: "மேகமூட்டம்",
    overcast: "அடர்ந்த மேகமூட்டம்",
    lightRain: "லேசான மழை",
    rain: "மழை",
    heavyRain: "கனமழை",
    drizzle: "தூறல்",
    thunderstorm: "இடியுடன் கூடிய மழை",
    snow: "பனிப்பொழிவு",
    mist: "மெல்லிய பனிமூட்டம்",
    haze: "மங்கலான வானிலை",
    fog: "அடர்ந்த பனிமூட்டம்",
    smoke: "புகை",
    dust: "தூசிக் காற்று",
    tornado: "சுழற்காற்று",
  },
  ml: {
    clear: "തെളിഞ്ഞ ആകാശം",
    partlyCloudy: "ഭാഗികമായി മേഘാവൃതം",
    cloudy: "മേഘാവൃതം",
    overcast: "കനത്ത മേഘാവരണം",
    lightRain: "നേരിയ മഴ",
    rain: "മഴ",
    heavyRain: "കനത്ത മഴ",
    drizzle: "ചാറ്റൽമഴ",
    thunderstorm: "ഇടിമിന്നലോടുകൂടിയ മഴ",
    snow: "മഞ്ഞുവീഴ്ച",
    mist: "നേർത്ത മൂടൽമഞ്ഞ്",
    haze: "മങ്ങിയ കാലാവസ്ഥ",
    fog: "കനത്ത മൂടൽമഞ്ഞ്",
    smoke: "പുക",
    dust: "പൊടിക്കാറ്റ്",
    tornado: "ചുഴലിക്കാറ്റ്",
  },
  mr: {
    clear: "निरभ्र आकाश",
    partlyCloudy: "अंशतः ढगाळ",
    cloudy: "ढगाळ वातावरण",
    overcast: "दाट ढग",
    lightRain: "हलका पाऊस",
    rain: "पाऊस",
    heavyRain: "मुसळधार पाऊस",
    drizzle: "रिमझिम पाऊस",
    thunderstorm: "मेघगर्जनेसह पाऊस",
    snow: "हिमवर्षाव",
    mist: "हलके धुके",
    haze: "धूसर वातावरण",
    fog: "दाट धुके",
    smoke: "धूर",
    dust: "धुळीचे वारे",
    tornado: "चक्रीवादळ",
  },
  gu: {
    clear: "સ્વચ્છ આકાશ",
    partlyCloudy: "આંશિક વાદળછાયું",
    cloudy: "વાદળછાયું વાતાવરણ",
    overcast: "ઘેરા વાદળો",
    lightRain: "હળવો વરસાદ",
    rain: "વરસાદ",
    heavyRain: "ભારે વરસાદ",
    drizzle: "ઝરમર વરસાદ",
    thunderstorm: "ગાજવીજ સાથે વરસાદ",
    snow: "હિમવર્ષા",
    mist: "હળવું ધુમ્મસ",
    haze: "ધૂંધળું વાતાવરણ",
    fog: "ઘાટું ધુમ્મસ",
    smoke: "ધુમાડો",
    dust: "ધૂળવાળો પવન",
    tornado: "વાવાઝોડું",
  },
};

function classifyWeatherCondition(value: string): WeatherCondition | null {
  const condition = value.trim().toLowerCase();

  if (condition.includes("thunder")) return "thunderstorm";
  if (condition.includes("drizzle")) return "drizzle";
  if (condition.includes("snow") || condition.includes("sleet")) return "snow";
  if (condition.includes("tornado") || condition.includes("squall")) return "tornado";
  if (condition.includes("fog")) return "fog";
  if (condition.includes("mist")) return "mist";
  if (condition.includes("haze")) return "haze";
  if (condition.includes("smoke")) return "smoke";
  if (
    condition.includes("dust") ||
    condition.includes("sand") ||
    condition.includes("ash")
  ) {
    return "dust";
  }
  if (condition.includes("rain")) {
    if (
      condition.includes("heavy") ||
      condition.includes("extreme") ||
      condition.includes("torrential")
    ) {
      return "heavyRain";
    }
    if (condition.includes("light")) return "lightRain";
    return "rain";
  }
  if (condition.includes("cloud")) {
    if (condition.includes("overcast")) return "overcast";
    if (condition.includes("few") || condition.includes("scattered")) {
      return "partlyCloudy";
    }
    return "cloudy";
  }
  if (condition.includes("clear") || condition.includes("sun")) return "clear";
  return null;
}

export function translateWeatherCondition(
  condition: string,
  language: LanguageCode,
) {
  if (language === "en") return condition;
  const key = classifyWeatherCondition(condition);
  return key ? weatherConditions[language][key] : condition;
}
