"""
quiz_generation/rag_quiz.py — Generate quiz questions from a node's FAISS index.

Used as the fallback when no Kahoot quiz passes the relevance threshold (PRD §4).
Retrieves the most relevant chunks from the node's own FAISS index, then asks
OpenAI to generate multiple-choice questions grounded in that material.
"""

import json
import requests
import numpy as np
from openai import OpenAI

EMBED_SIDECAR_URL = "http://localhost:5001/embed"
MODEL = "gpt-4o"
DEFAULT_NUM_QUESTIONS = 5
FAISS_K = 6


class RagQuizError(Exception):
    pass


def _get_embedding(text: str) -> np.ndarray:
    """
    Get a 768-float embedding from the Transformers.js sidecar.
    Returns a normalised float32 numpy array of shape (1, 768).
    """
    import faiss
    response = requests.post(EMBED_SIDECAR_URL, json={"text": text}, timeout=10)
    response.raise_for_status()
    vector = np.array([response.json()["vector"]], dtype=np.float32)
    faiss.normalize_L2(vector)
    return vector


def generate(node, num_questions: int = DEFAULT_NUM_QUESTIONS, client: OpenAI = None) -> list[dict]:
    """
    Generate multiple-choice questions for `node` using its FAISS index.

    Steps:
      1. Embed node.title via the Transformers.js sidecar.
      2. Query node.search_faiss(vec, k=FAISS_K) for the most relevant chunks.
      3. Call OpenAI with the retrieved context to generate questions.

    Returns a list of standard question dicts:
      {question, options: {A,B,C,D}, answer, explanation}

    Returns an empty list if the node has no indexed chunks.
    Raises RagQuizError on unrecoverable failures.
    """
    if client is None:
        client = OpenAI()

    # Step 1 — embed the topic title
    try:
        query_vec = _get_embedding(node.title)
    except Exception as e:
        raise RagQuizError(f"Embedding sidecar unavailable: {e}") from e

    # Step 2 — retrieve chunks from this node's own FAISS index
    chunks = node.search_faiss(query_vec, k=FAISS_K)
    if not chunks:
        return []

    context = "\n\n---\n\n".join(chunks)

    # Step 3 — generate questions via OpenAI
    prompt = (
        f"You are generating a quiz for a student studying '{node.title}'.\n"
        f"Using ONLY the notes provided below, generate {num_questions} "
        f"multiple-choice questions.\n\n"
        f"Rules:\n"
        f"- Each question must have exactly 4 options labelled A, B, C, D.\n"
        f"- One option must be correct; the others must be plausible distractors.\n"
        f"- The explanation must cite which part of the notes supports the answer.\n"
        f"- Do not introduce facts not present in the notes.\n\n"
        f"Return ONLY a JSON object with key 'questions' containing an array:\n"
        f'[{{"question": str, "options": {{"A": str, "B": str, "C": str, "D": str}}, '
        f'"answer": str, "explanation": str}}]\n\n'
        f"Notes:\n{context}"
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
    except Exception as e:
        raise RagQuizError(f"OpenAI quiz generation failed: {e}") from e

    questions = result if isinstance(result, list) else result.get("questions", [])
    return _validate_questions(questions)


def _validate_questions(questions: list) -> list[dict]:
    """
    Drop malformed questions — must have question text, 4 options, and a valid answer key.
    """
    valid = []
    required_keys = {"A", "B", "C", "D"}
    for q in questions:
        if not isinstance(q, dict):
            continue
        if not q.get("question"):
            continue
        options = q.get("options", {})
        if not required_keys.issubset(options.keys()):
            continue
        if q.get("answer") not in required_keys:
            continue
        valid.append(q)
    return valid
