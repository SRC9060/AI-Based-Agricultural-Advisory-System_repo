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
    """Build a conservative answer directly from retrieved PDF passages."""
    query_words = set(re.findall(r"[a-z]{3,}", query.lower()))
    ignored_words = {
        "also", "after", "before", "from", "have", "there", "their",
        "this", "that", "tell", "with", "yesterday", "today", "tomorrow",
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
    if any(term in query.lower() for term in SCHEME_TERMS):
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

    if not selected:
        return (
            "I could not find a sufficiently relevant passage in the local "
            "knowledge base. Please provide the crop, symptoms, location, and "
            "question separately, or consult your local agriculture officer."
        )

    return (
        "The online AI service is unavailable, so here is information retrieved "
        "directly from the local knowledge base: "
        + " ".join(selected)
        + " Verify the diagnosis and pesticide choice with a local agriculture "
          "officer before spraying."
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
