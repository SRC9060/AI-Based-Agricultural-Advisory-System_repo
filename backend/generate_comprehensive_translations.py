import json
import re
import sys
import requests
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding="utf-8")

CUSTOM_OVERRIDES = {
    "Ridgeguard(Tori)": {
        "hi": "तुरई (तोरी)", "kn": "ಹೀರೆಕಾಯಿ", "te": "బీరకాయ", "ta": "பீர்க்கங்காய்", "ml": "പീച്ചിങ്ങ", "mr": "शिराळे", "gu": "તુરિયા"
    },
    "Ridgeguard": {
        "hi": "तुरई", "kn": "ಹೀರೆಕಾಯಿ", "te": "బీరಕಾಯ", "ta": "பீர்க்கங்காய்", "ml": "പീച്ചിങ്ങ", "mr": "शिराळे", "gu": "તુરિયા"
    },
    "Ridge Gourd": {
        "hi": "तुरई", "kn": "ಹೀರೆಕಾಯಿ", "te": "బీరకాయ", "ta": "பீர்க்கங்காய்", "ml": "പീച്ചിങ്ങ", "mr": "शिराळे", "gu": "તુરિયા"
    },
    "Cluster beans": {
        "hi": "ग्वार फली", "kn": "ಗೋರಿಕಾಯಿ", "te": "గోరుచిక్కుడు", "ta": "கொத்தவரங்காய்", "ml": "അമരക്ക", "mr": "गवार", "gu": "ગુવાર"
    },
    "Bitter gourd": {
        "hi": "करेला", "kn": "ಹಾಗಲಕಾಯಿ", "te": "కాకరకాయ", "ta": "பாகற்காய்", "ml": "പാവയ്ക്ക", "mr": "कारले", "gu": "કરેલા"
    },
    "Bottle gourd": {
        "hi": "लौकी", "kn": "ಸೋರೆಕಾಯಿ", "te": "సొరకాయ", "ta": "சுரைக்காய்", "ml": "ചുരയ്ക്ക", "mr": "दुधी भोपळा", "gu": "દુધી"
    },
    "Bhindi(Ladies Finger)": {
        "hi": "भिंडी", "kn": "ಬೆಂಡೆಕಾಯಿ", "te": "బెండకాయ", "ta": "வெண்டைக்காய்", "ml": "വെണ്ടയ്ക്ക", "mr": "भेंडी", "gu": "ભીંડા"
    },
    "Bhindi (ಬೆಂಡೆಕಾಯಿ)": {
        "hi": "भिंडी", "kn": "ಬೆಂಡೆಕಾಯಿ", "te": "బెండకాయ", "ta": "வெண்டைக்காய்", "ml": "വെണ്ടയ്ക്ക", "mr": "भेंडी", "gu": "ભીંડા"
    },
    "Bhindi": {
        "hi": "भिंडी", "kn": "ಬೆಂಡೆಕಾಯಿ", "te": "బెండకాయ", "ta": "வெண்டைக்காய்", "ml": "വെണ്ടയ്ക്ക", "mr": "भेंडी", "gu": "ભીંડા"
    },
    "Cowpea(Veg)": {
        "hi": "लोबिया (सब्जी)", "kn": "ಅಲಸಂದಿ", "te": "అలసందలు", "ta": "தட்டப்பயறு", "ml": "പയർ", "mr": "चवळी", "gu": "ચોળી"
    },
    "Cowpea": {
        "hi": "लोबिया", "kn": "ಅಲಸಂದಿ", "te": "అలసందలు", "ta": "தட்டப்பயறு", "ml": "പയർ", "mr": "चवळी", "gu": "ચોળી"
    },
    "Bataani/Green": {
        "hi": "हरी मटर", "kn": "ಹಸಿ ಬಟಾಣಿ", "te": "పచ్చి బటాణీలు", "ta": "பச்சை பட்டாணி", "ml": "പച്ചപ്പട്ടാണി", "mr": "हिरवा वाटाणा", "gu": "લીલા વટાણા"
    },
    "Snakeguard": {
        "hi": "चिचिंडा", "kn": "ಪಡವಲಕಾಯಿ", "te": "పొట్లకాయ", "ta": "புடலங்காய்", "ml": "പടവലങ്ങ", "mr": "पडवळ", "gu": "પડોળા"
    },
    "Snake Gourd": {
        "hi": "चिचिंडा", "kn": "ಪಡವಲಕಾಯಿ", "te": "పొట్లకాయ", "ta": "புடலங்காய்", "ml": "പടവലങ്ങ", "mr": "पडवळ", "gu": "પડોળા"
    },
    "Onion Green": {
        "hi": "हरा प्याज", "kn": "ಹಸಿ ಈರುಳ್ಳಿ", "te": "ఉల్లి కాడలు", "ta": "வெங்காய தாள்", "ml": "പച്ച സവാള", "mr": "पातकांदा", "gu": "લીલી ડુંગળી"
    },
    "Ground Nut Seed": {
        "hi": "मूंगफली का बीज", "kn": "ಕಡಲೆಕಾಯಿ ಬೀಜ", "te": "వేరుశనగ విత్తనం", "ta": "நிலக்கடலை விதை", "ml": "നിലക്കടല വിത്ത്", "mr": "भुईमूग बी", "gu": "મગફળીના બી"
    },
    "Green Gram (ಹೆಸರುಕಾಳು) (Whole)": {
        "hi": "मूंग (साबुत)", "kn": "ಹೆಸರುಕಾಳು (ಇಡೀ)", "te": "పెసలు (మొత్తం)", "ta": "பாசிப்பயறு (முழு)", "ml": "ചെറുപയർ (മുഴുവൻ)", "mr": "मूग (साबूत)", "gu": "ಮಗ (ಆખા)"
    },
    "Green Gram(Moong)(Whole)": {
        "hi": "मूंग (साबुत)", "kn": "ಹೆಸರುಕಾಳು (ಇಡೀ)", "te": "పెసలు (మొత్తం)", "ta": "பாசிப்பயறு (முழு)", "ml": "ചെറുപയർ (മുഴുവൻ)", "mr": "मूग (साबूत)", "gu": "ಮಗ (આખા)"
    },
    "Red gram/Arhar/Tur(whole)": {
        "hi": "अरहर (तूर) (साबुत)", "kn": "ತೊಗರಿ (ಇಡೀ)", "te": "కందులు (మొత్తం)", "ta": "துவரை (முழு)", "ml": "തവര (മുഴുവൻ)", "mr": "तूर (साबूत)", "gu": "તુવેર (આખી)"
    },
    "Pea Pod/Pea Cod/हरी मटर": {
        "hi": "मटर की फली", "kn": "ಬಟಾಣಿ ಕಾಯಿ", "te": "బటాణీ కాయలు", "ta": "பட்டாணி காய்", "ml": "പട്ടാണി പയർ", "mr": "वाटाणा शेंग", "gu": "વટાણા શીંગ"
    },
    "Keralam": {
        "hi": "केरल", "kn": "ಕೇರಳ", "te": "కేరళ", "ta": "கேரளா", "ml": "കേരളം", "mr": "केरळ", "gu": "કેરળ"
    },
    "Sweet Corn ": {
        "hi": "स्वीट कॉर्न", "kn": "ಸಿಹಿ ಮೆಕ್ಕೆಜೋಳ", "te": "స్వీట్ కార్న్", "ta": "ಸ್ವೀಟ್ கார்ன்", "ml": "സ്വീറ്റ് കോൺ", "mr": "स्वीट कॉर्न", "gu": "સ્વીટ કોર્ન"
    },
    "Sweet Corn": {
        "hi": "स्वीट कॉर्न", "kn": "ಸಿಹಿ ಮೆಕ್ಕೆಜೋಳ", "te": "స్వీట్ కార్న్", "ta": "ಸ್ವೀಟ್ கார்ன்", "ml": "സ്വീറ്റ് കോൺ", "mr": "स्वीट कॉर्न", "gu": "સ્વીટ કોર્ન"
    }
}

def translate_gtx(item_lang):
    item, target_lang = item_lang
    if item in CUSTOM_OVERRIDES and target_lang in CUSTOM_OVERRIDES[item]:
        return item, target_lang, CUSTOM_OVERRIDES[item][target_lang]
    if target_lang == "en":
        return item, target_lang, item
    
    clean_text = re.sub(r'[\u0900-\u0DFF]+', '', item)
    clean_text = re.sub(r'[\(\)]', ' ', clean_text).strip()
    if not clean_text:
        clean_text = item
        
    url = "https://translate.googleapis.com/translate_a/single"
    params = {"client": "gtx", "sl": "en", "tl": target_lang, "dt": "t", "q": clean_text}
    try:
        res = requests.get(url, params=params, timeout=5).json()
        if res and res[0] and res[0][0] and res[0][0][0]:
            return item, target_lang, res[0][0][0].strip()
    except Exception as e:
        pass
    return item, target_lang, item

def main():
    with open("backend/live_market_data_utf8.json", "r", encoding="utf-8") as f:
        live_data = json.load(f)

    commodities = live_data["commodities"]
    states = live_data["states"]
    districts = live_data["districts"]

    all_items = set(commodities + states + districts)
    for c in list(commodities):
        if "(" in c:
            clean_term = re.sub(r'\([^\)]*\)', '', c).strip()
            if clean_term:
                all_items.add(clean_term)

    langs = ["hi", "kn", "te", "ta", "ml", "mr", "gu"]
    with open("frontend/lib/coreTranslations.ts", "r", encoding="utf-8") as f:
        ts_content = f.read()

    def parse_lang_dict(lang_code):
        pattern = r'\b' + lang_code + r':\s*\{([\s\S]*?)\n  \},'
        m = re.search(pattern, ts_content)
        d = {}
        if m:
            for line in m.group(1).split("\n"):
                line = line.strip()
                km = re.match(r'^["\'](.*?)["\']\s*:\s*["\'](.*?)["\']', line)
                if km:
                    d[km.group(1)] = km.group(2)
        return d

    existing_dicts = {lang: parse_lang_dict(lang) for lang in langs}
    updated_dicts = {lang: dict(existing_dicts[lang]) for lang in langs}

    tasks = []
    for lang in langs:
        for item in all_items:
            if item not in updated_dicts[lang] or not updated_dicts[lang][item]:
                tasks.append((item, lang))

    print(f"Executing {len(tasks)} translation tasks concurrently...")
    with ThreadPoolExecutor(max_workers=20) as executor:
        results = executor.map(translate_gtx, tasks)
        for item, lang, trans in results:
            updated_dicts[lang][item] = trans

    with open("backend/generated_market_translations.json", "w", encoding="utf-8") as f:
        json.dump(updated_dicts, f, ensure_ascii=False, indent=2)

    print("Master translations generated successfully!")

if __name__ == "__main__":
    main()
