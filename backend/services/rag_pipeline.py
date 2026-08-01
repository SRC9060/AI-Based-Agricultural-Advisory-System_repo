import re
from pathlib import Path

from services.knowledge_base import (
    search_government_schemes,
    search_knowledge_base,
)
from services.llm import generate_llm_response
from services.translation import translate_text


SCHEME_TERMS = {
    "compensation",
    "government scheme",
    "insurance",
    "kisan credit card",
    "kcc",
    "pm kisan",
    "pm-kisan",
    "pmfby",
    "subsidy",
    "yojana",
}


def _local_extractive_response(query, documents):
    """Build a conservative answer directly from retrieved PDF passages or crop-specific rules."""
    query_lower = query.lower()
    query_words = set(re.findall(r"[a-z]{3,}", query_lower))
    ignored_words = {
        "also", "after", "before", "from", "have", "there", "their",
        "this", "that", "tell", "with", "yesterday", "today", "tomorrow",
        "what", "should", "how", "control", "which", "best",
    }
    query_words -= ignored_words
    farming_candidates = []
    scheme_candidates = []

    for document in documents:
        source = Path(document.metadata.get("source", "knowledge base")).stem
        folder = document.metadata.get("folder", "")
        text = (
            document.page_content
            .replace("\ufb01", "fi")
            .replace("\ufb02", "fl")
            .replace("\uf020", " ")
        )
        text = text.encode("ascii", errors="ignore").decode("ascii")
        text = re.sub(r"\s+", " ", text)
        for sentence in re.split(r"(?<=[.!?])\s+", text):
            sentence = sentence.strip(" -•\t")
            if not 45 <= len(sentence) <= 320:
                continue
            lowered = sentence.lower()
            if any(term in lowered for term in ("www.", "references", "email:", "vol.")):
                continue
            overlap = len(query_words & set(re.findall(r"[a-z]{3,}", lowered)))
            if overlap:
                candidate = (overlap, len(sentence), sentence, source)
                if folder == "Government_Schemes":
                    scheme_bonus = sum(
                        term in lowered
                        for term in (
                            "damage", "insurance", "loss", "rainfall",
                            "claim", "farmer",
                        )
                    )
                    scheme_candidates.append(
                        (overlap + scheme_bonus, len(sentence), sentence, source)
                    )
                else:
                    farming_candidates.append(candidate)

    farming_candidates.sort(key=lambda item: (-item[0], item[1]))
    scheme_candidates.sort(key=lambda item: (-item[0], item[1]))
    selected = []
    seen = set()

    desired_candidates = farming_candidates[:1]
    if any(term in query_lower for term in SCHEME_TERMS):
        desired_candidates += scheme_candidates[:1]
    elif len(desired_candidates) < 2:
        desired_candidates += farming_candidates[1:2]

    for _, _, sentence, source in desired_candidates:
        normalized = sentence.lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        selected.append(f"{sentence} (Source: {source})")
        if len(selected) == 3:
            break

    if selected:
        return (
            "Based on the local agricultural knowledge base: "
            + " ".join(selected)
            + " Verify the diagnosis and pesticide choice with a local agriculture officer before spraying."
        )

    # Crop & pest specific expert fallback rules
    if any(w in query_lower for w in ("wheat", "ಗೋಧಿ", "गेहूं", "ಗೋಧಿಯ", "గోధుమ")) and any(w in query_lower for w in ("yellow", "rust", "leaf", "leaves", "ಹಳದಿ", "ಎಲೆ", "ಎಲೆಗಳು", "पीला", "पत्ता")):
        return (
            "Yellowing in wheat leaves is commonly caused by Yellow Rust fungus or Nitrogen/Zinc deficiency. "
            "For Yellow Rust, spray Propiconazole 25 EC @ 1 ml per liter of water immediately upon seeing symptoms. "
            "If caused by nitrogen deficiency, apply top-dressing urea (25-30 kg/acre) before irrigation."
        )
    elif any(w in query_lower for w in ("cotton", "ಹತ್ತಿ", "कपास", "కపాస్")) and any(w in query_lower for w in ("whitefly", "fly", "pest", "insect", "ನೊಣ", "ಕೀಟ", "कीड़ा")):
        return (
            "To control whiteflies in cotton crops, install 10-12 yellow sticky traps per acre to catch adult insects. "
            "Spray Neem oil (1500 ppm) @ 5 ml per liter of water during early infestation. "
            "For severe attacks, spray Pyriproxyfen 10 EC @ 2 ml per liter or Diafenthiuron 50 WP @ 1.25 g per liter."
        )
    elif any(w in query_lower for w in ("paddy", "rice", "ಭತ್ತ", "ಅಕ್ಕಿ", "धान", "వరి")):
        return (
            "For paddy cultivation, maintain 2-5 cm standing water during tillering, apply balanced NPK fertilizers (120:60:60 kg/ha), "
            "and inspect regularly for stem borer or blast disease. Spray Tricyclazole 75 WP @ 0.6 g per liter of water for leaf blast control."
        )
    elif any(w in query_lower for w in ("tomato", "ಟೊಮೆಟೊ", "ಟೊಮ್ಯಾಟೊ", "टमाटर")):
        return (
            "For tomato crop management, control leaf curl virus vectors by placing yellow sticky traps. "
            "Spray Copper Oxychloride 3g per liter or Mancozeb 2g per liter for early and late blight protection, "
            "and ensure adequate calcium supply to prevent blossom end rot."
        )
    elif any(w in query_lower for w in ("sugarcane", "ಕಬ್ಬು", "गन्ना", "చెరకు")):
        return (
            "For sugarcane crop care, ensure timely earthing up and trash mulching to retain soil moisture. "
            "Apply 250 kg Nitrogen per hectare in 3 split doses, and control early shoot borer using Chlorantraniliprole 18.5 SC @ 0.4 ml per liter."
        )
    else:
        return (
            "For general pest and crop health management, inspect your fields weekly, maintain balanced NPK fertilization, "
            "use yellow sticky traps for sucking insects like whiteflies and thrips, and apply approved bio-pesticides or Neem oil sprays. "
            "Consult your nearest Krishi Vigyan Kendra (KVK) or local extension officer for crop-specific chemical spray dosages."
        )


def generate_response(query, language="en-IN", supplemental_context=""):
    results = search_knowledge_base(query)

    if any(term in query.lower() for term in SCHEME_TERMS):
        scheme_results = search_government_schemes(query)
        known_sources = {
            (doc.metadata.get("source"), doc.page_content)
            for doc in results
        }
        results.extend(
            doc for doc in scheme_results
            if (doc.metadata.get("source"), doc.page_content) not in known_sources
        )
    
    context = ""
    for doc in results:
        context += doc.page_content + "\n\n"
    if supplemental_context:
        context += (
            "\nLive service data supplied by the application:\n"
            + supplemental_context
            + "\n"
        )

    answer = generate_llm_response(
        query,
        context,
        fallback=lambda: _local_extractive_response(query, results),
    )

    if language != "en-IN":
        translated = translate_text(answer, "en-IN", language)
        answer = translated.translated_text

    return answer
    
if __name__ == "__main__":
    query = input("Ask a farming question: ")
    answer = generate_response(query)
    print("\nAI Answer:\n")
    print(answer)
