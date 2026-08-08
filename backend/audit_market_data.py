import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

with open("frontend/lib/coreTranslations.ts", "r", encoding="utf-8") as f:
    content = f.read()

with open("backend/live_market_data_utf8.json", "r", encoding="utf-8") as f:
    live = json.load(f)

langs = ["hi", "kn", "te", "ta", "ml", "mr", "gu"]

def parse_lang_block(lang, text):
    pattern = r'\b' + lang + r':\s*\{([\s\S]*?)\n  \},'
    m = re.search(pattern, text)
    kv = {}
    if m:
        for line in m.group(1).split("\n"):
            line = line.strip()
            km = re.match(r'^["\'](.*?)["\']\s*:\s*["\'](.*?)["\']', line)
            if km:
                k = km.group(1).replace('\\"', '"')
                v = km.group(2).replace('\\"', '"')
                kv[k] = v
    return kv

COMMODITY_ALIASES = {
    "ridgeguard": "Ridge Gourd",
    "ridgeguard (tori)": "Ridge Gourd",
    "ridgeguard(tori)": "Ridge Gourd",
    "ridge gourd": "Ridge Gourd",
    "bitter gourd": "Bitter Gourd",
    "bottle gourd": "Bottle Gourd",
    "snakeguard": "Snake Gourd",
    "snake gourd": "Snake Gourd",
    "sponge gourd": "Sponge Gourd",
    "cluster beans": "Cluster Beans",
    "bhindi": "Ladies Finger",
    "bhindi(ladies finger)": "Ladies Finger",
    "bhindi (ladies finger)": "Ladies Finger",
    "lady finger": "Ladies Finger",
    "ladies finger": "Ladies Finger",
    "cowpea(veg)": "Cowpea",
    "cowpea (veg)": "Cowpea",
    "bataani/green": "Green Peas",
    "bataani green": "Green Peas",
    "onion green": "Green Onion",
    "ground nut seed": "Groundnut Seed",
    "green gram(moong)(whole)": "Green Gram (Whole)",
    "red gram/arhar/tur(whole)": "Red Gram (Whole)",
    "sweet corn": "Sweet Corn",
    "keralam": "Kerala",
    "chattrapati sambhajinagar": "Aurangabad",
    "east champaran/ motihari": "East Champaran"
}

def strip_indic(text):
    return re.sub(r'[\u0900-\u0DFF]+', '', text).strip()

def resolve_label(raw_str, lang_dict):
    if not raw_str:
        return raw_str
    trimmed = raw_str.strip()
    if raw_str in lang_dict:
        return lang_dict[raw_str]
    if trimmed in lang_dict:
        return lang_dict[trimmed]

    clean = strip_indic(trimmed)
    if clean in lang_dict:
        return lang_dict[clean]

    lower = clean.lower()
    if lower in COMMODITY_ALIASES:
        canonical = COMMODITY_ALIASES[lower]
        if canonical in lang_dict:
            return lang_dict[canonical]

    if "(" in clean:
        parts = [p.strip(" ()") for p in clean.split("(")]
        parts = [p for p in parts if p]
        trans_parts = []
        for p in parts:
            if p in lang_dict:
                trans_parts.append(lang_dict[p])
            elif p.lower() in COMMODITY_ALIASES and COMMODITY_ALIASES[p.lower()] in lang_dict:
                trans_parts.append(lang_dict[COMMODITY_ALIASES[p.lower()]])
            else:
                trans_parts.append(p)
        if len(trans_parts) > 1:
            return f"{trans_parts[0]} ({trans_parts[1]})"
        elif len(trans_parts) == 1:
            return trans_parts[0]

    return None

print("=========================================================================")
print("          COMPLETE MARKET PRICES LOCALIZATION RESOLVER AUDIT              ")
print("=========================================================================")

all_passed = True

for lang in langs:
    kv = parse_lang_block(lang, content)

    unresolved_c = [c for c in live['commodities'] if not resolve_label(c, kv)]
    unresolved_s = [s for s in live['states'] if not resolve_label(s, kv)]
    unresolved_d = [d for d in live['districts'] if not resolve_label(d, kv)]

    total_c = len(live['commodities'])
    total_s = len(live['states'])
    total_d = len(live['districts'])

    cov_c = total_c - len(unresolved_c)
    cov_s = total_s - len(unresolved_s)
    cov_d = total_d - len(unresolved_d)

    is_ok = (len(unresolved_c) == 0 and len(unresolved_s) == 0 and len(unresolved_d) == 0)
    if not is_ok:
        all_passed = False

    status = "PASSED (100% Coverage)" if is_ok else "FAILED"

    print(f"Language [{lang.upper()}]: {status}")
    print(f"  - Commodities: {cov_c}/{total_c} ({(cov_c/total_c)*100:.1f}%)")
    if unresolved_c:
        print(f"    Unresolved Commodities: {unresolved_c}")
    print(f"  - States:      {cov_s}/{total_s} ({(cov_s/total_s)*100:.1f}%)")
    if unresolved_s:
        print(f"    Unresolved States: {unresolved_s}")
    print(f"  - Districts:   {cov_d}/{total_d} ({(cov_d/total_d)*100:.1f}%)")
    if unresolved_d:
        print(f"    Unresolved Districts: {unresolved_d}")
    print("-------------------------------------------------------------------------")

print("\nFINAL VERIFICATION RESULT:", "100% SUCCESS! ALL LIVE MARKET OPTIONS LOCALIZED!" if all_passed else "LOCALIZATION INCOMPLETE!")
