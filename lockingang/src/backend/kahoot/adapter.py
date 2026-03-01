"""
kahoot/adapter.py — Convert raw Kahoot questions to the standard quiz format.

Standard format used throughout the app:
  {
    "question":    str,
    "options":     {"A": str, "B": str, "C": str, "D": str},
    "answer":      str,          # "A", "B", "C", or "D"
    "explanation": str,
  }

No external API calls — pure transformation.
"""

OPTION_KEYS = ["A", "B", "C", "D"]


def adapt(kahoot_quiz: dict) -> list[dict]:
    """
    Convert all questions in a raw Kahoot quiz dict to standard format.
    Skips questions that have no choices or no correct answer marked.
    Returns a list of standard question dicts.
    """
    adapted = []
    for q in kahoot_quiz.get("questions", []):
        question = adapt_question(q)
        if question is not None:
            adapted.append(question)
    return adapted


def adapt_question(raw_question: dict) -> dict | None:
    """
    Convert a single raw Kahoot question to standard format.
    Returns None if the question is malformed (missing choices or correct answer).
    """
    question_text = raw_question.get("question", "").strip()
    choices = raw_question.get("choices", [])

    if not question_text or not choices:
        return None

    # Kahoot supports up to 4 choices; pad or trim to exactly 4
    choices = choices[:4]
    while len(choices) < 4:
        choices.append({"answer": "N/A", "correct": False})

    options = {
        OPTION_KEYS[i]: choices[i].get("answer", "").strip()
        for i in range(4)
    }

    # Find the index of the correct choice
    correct_index = next(
        (i for i, c in enumerate(choices) if c.get("correct", False)),
        None,
    )
    if correct_index is None:
        return None

    answer_key = OPTION_KEYS[correct_index]
    correct_text = options[answer_key]

    return {
        "question": question_text,
        "options": options,
        "answer": answer_key,
        "explanation": f"The correct answer is '{correct_text}'.",
    }


def filter_duplicates(questions: list[dict]) -> list[dict]:
    """
    Remove questions with identical question text.
    Preserves the first occurrence.
    """
    seen = set()
    unique = []
    for q in questions:
        text = q.get("question", "")
        if text not in seen:
            seen.add(text)
            unique.append(q)
    return unique
