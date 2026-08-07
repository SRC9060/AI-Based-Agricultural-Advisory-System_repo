import sys
import os
import re
import json

sys.stdout.reconfigure(encoding="utf-8")

from build_full_market_translations import STATES_MAP, DISTRICTS_MAP, COMMODITIES_MAP

# Read frontend/lib/coreTranslations.ts
with open("frontend/lib/coreTranslations.ts", "r", encoding="utf-8") as f:
    content = f.read()

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
                kv[km.group(1)] = km.group(2)
    return kv

total_audited_states = len(STATES_MAP)
total_audited_districts = len(DISTRICTS_MAP)
total_audited_commodities = len(COMMODITIES_MAP)

print("=========================================================================")
print("                   MARKET PRICES LOCALIZATION AUDIT                      ")
print("=========================================================================")
print(f"Audited Categories:")
print(f"  - Total States & UTs: {total_audited_states}")
print(f"  - Total Districts:    {total_audited_districts}")
print(f"  - Total Commodities:  {total_audited_commodities}")
print("-------------------------------------------------------------------------")

all_passed = True

for lang in langs:
    kv = parse_lang_block(lang, content)
    
    missing_states = [s for s in STATES_MAP if s not in kv]
    missing_districts = [d for d in DISTRICTS_MAP if d not in kv]
    missing_commodities = [c for c in COMMODITIES_MAP if c not in kv]
    
    states_cov = total_audited_states - len(missing_states)
    districts_cov = total_audited_districts - len(missing_districts)
    commodities_cov = total_audited_commodities - len(missing_commodities)
    
    status = "PASSED (100% Coverage)" if (len(missing_states) == 0 and len(missing_districts) == 0 and len(missing_commodities) == 0) else "FAILED"
    if status != "PASSED (100% Coverage)":
        all_passed = False
        
    print(f"Language [{lang.upper()}]: {status}")
    print(f"  - States Translated:      {states_cov}/{total_audited_states} ({(states_cov/total_audited_states)*100:.1f}%)")
    print(f"  - Districts Translated:   {districts_cov}/{total_audited_districts} ({(districts_cov/total_audited_districts)*100:.1f}%)")
    print(f"  - Commodities Translated: {commodities_cov}/{total_audited_commodities} ({(commodities_cov/total_audited_commodities)*100:.1f}%)")
    if missing_states:
        print(f"    Missing States: {missing_states}")
    if missing_districts:
        print(f"    Missing Districts: {missing_districts}")
    if missing_commodities:
        print(f"    Missing Commodities: {missing_commodities}")
    print("-------------------------------------------------------------------------")

print("\nFINAL RESULT:", "100% LOCALIZATION COVERAGE VERIFIED FOR ALL LANGUAGES!" if all_passed else "LOCALIZATION INCOMPLETE!")
