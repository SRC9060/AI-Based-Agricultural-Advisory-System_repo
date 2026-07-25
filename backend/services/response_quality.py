def calculate_response_quality(intent_confidence, response_text):
    """
    Calculates the quality of the generated response.

    Returns:
        quality_score (0-1)
        confidence_level (HIGH/MEDIUM/LOW)
        needs_human_review (True/False)
    """

    # Normalize confidence
    quality_score = max(0.0, min(1.0, round(float(intent_confidence), 2)))

    # Penalize empty or very short responses
    if not response_text or len(response_text.strip()) < 30:
        quality_score *= 0.5

    LOW_CONFIDENCE_WORDS = [
        "maybe",
        "might",
        "possibly",
        "could be",
        "not sure",
        "uncertain",
        "unknown",
        "cannot determine"
    ]

    response_lower = response_text.lower()

    if any(word in response_lower for word in LOW_CONFIDENCE_WORDS):
        quality_score *= 0.6

    # Determine confidence level
    if quality_score >= 0.80:
        confidence_level = "HIGH"
        needs_human_review = False

    elif quality_score >= 0.50:
        confidence_level = "MEDIUM"
        needs_human_review = False

    else:
        confidence_level = "LOW"
        needs_human_review = True

    return {
        "quality_score": quality_score,
        "confidence_level": confidence_level,
        "needs_human_review": needs_human_review
    }


if __name__ == "__main__":

    result = calculate_response_quality(
        0.92,
        "PM Kisan is a Central Sector Scheme..."
    )

    print(result)