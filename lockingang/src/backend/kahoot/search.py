"""
kahoot/search.py — Search Kahoot for quizzes matching a topic.

Kahoot does not publish an official public API, so this module uses
their internal search endpoint. If that breaks, swap in a scraper.
Returns raw Kahoot quiz dicts; no OpenAI calls happen here.
"""

import requests

KAHOOT_SEARCH_URL = "https://create.kahoot.it/rest/kahoots/"
DEFAULT_LIMIT = 5
REQUEST_TIMEOUT = 10  # seconds


class KahootSearchError(Exception):
    pass


def search(topic: str, limit: int = DEFAULT_LIMIT) -> list[dict]:
    """
    Search Kahoot for public quizzes matching `topic`.

    Returns a list of raw Kahoot quiz dicts, each containing at minimum:
      {
        "uuid":      str,
        "title":     str,
        "questions": [{"question": str, "choices": [{"answer": str, "correct": bool}]}]
      }

    Returns an empty list if no results are found.
    Raises KahootSearchError on network or API failure.
    """
    params = {
        "query": topic,
        "limit": limit,
        "orderBy": "relevance",
        "searchCluster": 1,
        "includeExtendedCounters": False,
    }

    try:
        response = requests.get(
            KAHOOT_SEARCH_URL,
            params=params,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
    except requests.RequestException as e:
        raise KahootSearchError(f"Kahoot search failed for '{topic}': {e}") from e

    data = response.json()
    return data.get("entities", [])


def extract_questions(kahoot_quiz: dict) -> list[dict]:
    """
    Pull the raw questions list out of a Kahoot quiz dict.
    Returns an empty list if the quiz has no questions key.
    """
    return kahoot_quiz.get("questions", [])
