import type { LanguageCode } from "@/lib/languages";

type TranslationTable = Partial<Record<LanguageCode, Record<string, string>>>;

export const fixTranslations: TranslationTable = {
  hi: {
    "Our AI is searching the agricultural schemes knowledge base.": "हमारा एआई कृषि योजनाओं के ज्ञान भंडार में खोज कर रहा है।",
    "AgriAdvisor Scheme Assistant": "AgriAdvisor योजना सहायक",
    "AI-powered government scheme guidance": "एआई आधारित सरकारी योजना मार्गदर्शन",
  },
  te: {
    "Our AI is searching the agricultural schemes knowledge base.": "మా ఏఐ వ్యవసాయ పథకాల జ్ఞాన భాండాగారంలో వెతుకుతోంది.",
    "AgriAdvisor Scheme Assistant": "AgriAdvisor పథకాల సహాయకుడు",
    "AI-powered government scheme guidance": "ఏఐ ఆధారిత ప్రభుత్వ పథకాల మార్గదర్శనం",
  },
  kn: {
    "Our AI is searching the agricultural schemes knowledge base.": "ನಮ್ಮ ಎಐ ಕೃಷಿ ಯೋಜನೆಗಳ ಜ್ಞಾನ ಭಂಡಾರದಲ್ಲಿ ಹುಡುಕುತ್ತಿದೆ.",
    "AgriAdvisor Scheme Assistant": "AgriAdvisor ಯೋಜನೆ ಸಹಾಯಕ",
    "AI-powered government scheme guidance": "ಎಐ ಆಧಾರಿತ ಸರ್ಕಾರಿ ಯೋಜನೆ ಮಾರ್ಗದರ್ಶನ",
  },
  ta: {
    "Our AI is searching the agricultural schemes knowledge base.": "எங்கள் ஏஐ வேளாண் திட்டங்களின் அறிவுத் தளத்தில் தேடுகிறது.",
    "AgriAdvisor Scheme Assistant": "AgriAdvisor திட்ட உதவியாளர்",
    "AI-powered government scheme guidance": "ஏஐ ஆதரவு அரசு திட்ட வழிகாட்டுதல்",
  },
  ml: {
    "Our AI is searching the agricultural schemes knowledge base.": "ഞങ്ങളുടെ എഐ കാർഷിക പദ്ധതികളുടെ വിജ്ഞാനശേഖരത്തിൽ തിരയുകയാണ്.",
    "AgriAdvisor Scheme Assistant": "AgriAdvisor പദ്ധതി സഹായി",
    "AI-powered government scheme guidance": "എഐ അധിഷ്ഠിത സർക്കാർ പദ്ധതി മാർഗനിർദേശം",
  },
  mr: {
    "Our AI is searching the agricultural schemes knowledge base.": "आमचे एआय कृषी योजनांच्या ज्ञानसंग्रहात शोध घेत आहे.",
    "AgriAdvisor Scheme Assistant": "AgriAdvisor योजना सहाय्यक",
    "AI-powered government scheme guidance": "एआय आधारित सरकारी योजना मार्गदर्शन",
  },
  gu: {
    "Our AI is searching the agricultural schemes knowledge base.": "અમારું એઆઈ કૃષિ યોજનાઓના જ્ઞાનભંડારમાં શોધી રહ્યું છે.",
    "AgriAdvisor Scheme Assistant": "AgriAdvisor યોજના સહાયક",
    "AI-powered government scheme guidance": "એઆઈ આધારિત સરકારી યોજના માર્ગદર્શન",
  },
};
