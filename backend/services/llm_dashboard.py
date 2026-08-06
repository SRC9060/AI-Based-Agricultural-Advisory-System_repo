from services.llm import generate_llm_response


def _fallback_scheme_titles(context: str) -> str:
    lines = []
    if context:
        for line in context.split("\n"):
            line = line.strip()
            if (
                line
                and len(line) < 120
                and not line.startswith("Context:")
                and not line.startswith("Question:")
                and not line.startswith("http")
            ):
                lines.append(line)
            if len(lines) >= 5:
                break
    if not lines:
        lines = [
            "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
            "Kisan Credit Card (KCC) Scheme",
            "Sub-Mission on Agricultural Mechanization (SMAM)",
            "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
        ]
    return "\n".join(lines)


def generate_scheme_titles(question: str, context: str) -> str:
    try:
        title_prompt = (
            "Extract and return ONLY the TOP 5 most relevant government scheme names from the context.\n"
            "Rules: One scheme name per line. No explanation. No numbering. No bullet points. Return plain text only.\n\n"
            f"Context:\n{context}\n\nQuestion:\n{question}"
        )
        return generate_llm_response(
            title_prompt,
            context,
            fallback=lambda: _fallback_scheme_titles(context),
        )
    except Exception as error:
        print(f"generate_scheme_titles exception: {error}")
        return _fallback_scheme_titles(context)