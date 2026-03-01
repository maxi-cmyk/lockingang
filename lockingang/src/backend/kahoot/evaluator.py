"""
kahoot/evaluator.py — Score a Kahoot quiz for relevance to a node topic.

Sends the quiz questions to OpenAI and gets back a relevance score (0–1).
A score >= 0.7 means the quiz is good enough to use (PRD §4).
"""

import json
from openai import OpenAI

RELEVANCE_THRESHOLD = 0.7
MODEL = "gpt-4o"


def evaluate(kahoot_quiz: dict, node_title: str, client: OpenAI = None) -> dict:
    """
    Score a Kahoot quiz for relevance and difficulty against `node_title`.

    Returns:
      {
        "relevance":  float,   # 0.0–1.0
        "difficulty": int,     # 1–5
        "usable":     bool,    # True if relevance >= RELEVANCE_THRESHOLD
      }

    Falls back to {"relevance": 0.0, "difficulty": 1, "usable": False}
    if OpenAI returns an unparseable response.
    """
    if client is None:
        client = OpenAI()

    questions = kahoot_quiz.get("questions", [])
    if not questions:
        return {"relevance": 0.0, "difficulty": 1, "usable": False}

    questions_text = "\n".join(
        f"- {q.get('question', '')}" for q in questions
    )

    prompt = (
        f"You are evaluating quiz questions for a student studying '{node_title}'.\n"
        f"Rate how relevant and appropriate these questions are for that topic.\n\n"
        f"Questions:\n{questions_text}\n\n"
        f"Return ONLY a JSON object with exactly these keys:\n"
        f'  {{"relevance": <float 0.0-1.0>, "difficulty": <int 1-5>}}\n'
        f"relevance: 1.0 = perfectly on-topic, 0.0 = completely unrelated.\n"
        f"difficulty: 1 = very easy, 5 = very hard."
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        relevance = float(result.get("relevance", 0.0))
        difficulty = int(result.get("difficulty", 1))
    except Exception:
        return {"relevance": 0.0, "difficulty": 1, "usable": False}

    return {
        "relevance": relevance,
        "difficulty": difficulty,
        "usable": relevance >= RELEVANCE_THRESHOLD,
    }


def pick_best(kahoot_quizzes: list[dict], node_title: str, client: OpenAI = None) -> dict | None:
    """
    Evaluate a list of Kahoot quizzes and return the most relevant one
    that passes the threshold, or None if none qualify.
    """
    best = None
    best_score = -1.0

    for quiz in kahoot_quizzes:
        result = evaluate(quiz, node_title, client)
        if result["usable"] and result["relevance"] > best_score:
            best = quiz
            best_score = result["relevance"]

    return best
