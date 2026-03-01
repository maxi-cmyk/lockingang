"""
quiz_generation/synthesis.py — Generate synthesis questions for Diamond Problem nodes.

A Diamond node has 2+ parents. Synthesis questions require the student to integrate
knowledge from multiple parent concepts (PRD §4).
Queries each parent's own FAISS index separately, then asks OpenAI to generate
questions that require understanding both.
"""

import json
import requests
import numpy as np
from openai import OpenAI

EMBED_SIDECAR_URL = "http://localhost:5001/embed"
MODEL = "gpt-4o"
DEFAULT_NUM_QUESTIONS = 2
PARENT_CHUNK_K = 3


class SynthesisError(Exception):
    pass


def _get_embedding(text: str) -> np.ndarray:
    """Get a normalised 768-float embedding from the Transformers.js sidecar."""
    import faiss
    response = requests.post(EMBED_SIDECAR_URL, json={"text": text}, timeout=10)
    response.raise_for_status()
    vector = np.array([response.json()["vector"]], dtype=np.float32)
    faiss.normalize_L2(vector)
    return vector


def generate(child_node, num_questions: int = DEFAULT_NUM_QUESTIONS, client: OpenAI = None) -> list[dict]:
    """
    Generate synthesis questions for a Diamond Problem node.

    Requires child_node.parents to have at least 2 entries.
    Pulls PARENT_CHUNK_K chunks from each parent's FAISS index,
    then prompts OpenAI to generate questions requiring integrated understanding.

    Returns a list of standard question dicts:
      {question, options: {A,B,C,D}, answer, explanation}

    Returns an empty list if fewer than 2 parents exist or no chunks are found.
    Raises SynthesisError on unrecoverable failures.
    """
    if len(child_node.parents) < 2:
        return []

    if client is None:
        client = OpenAI()

    parent_contexts = _collect_parent_contexts(child_node.parents[:2])
    if not parent_contexts:
        return []

    p1, p2 = parent_contexts[0], parent_contexts[1]

    prompt = (
        f"You are generating advanced synthesis questions for a student who has studied "
        f"both '{p1['title']}' and '{p2['title']}', and is now learning '{child_node.title}'.\n\n"
        f"Generate {num_questions} multiple-choice questions that REQUIRE the student to "
        f"integrate knowledge from BOTH '{p1['title']}' AND '{p2['title']}' to answer correctly.\n\n"
        f"Rules:\n"
        f"- Each question must reference or depend on concepts from both parent topics.\n"
        f"- Each question must have exactly 4 options labelled A, B, C, D.\n"
        f"- The explanation must state which concept from each parent topic is needed.\n\n"
        f"Return ONLY a JSON object with key 'questions' containing an array:\n"
        f'[{{"question": str, "options": {{"A": str, "B": str, "C": str, "D": str}}, '
        f'"answer": str, "explanation": str}}]\n\n'
        f"Notes on '{p1['title']}':\n{p1['context']}\n\n"
        f"Notes on '{p2['title']}':\n{p2['context']}"
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
    except Exception as e:
        raise SynthesisError(f"OpenAI synthesis generation failed: {e}") from e

    questions = result if isinstance(result, list) else result.get("questions", [])
    return _validate_questions(questions)


def _collect_parent_contexts(parents: list) -> list[dict]:
    """
    For each parent node, embed its title and retrieve its top chunks from its own FAISS index.
    Returns a list of {title, context} dicts. Skips parents with empty FAISS indexes.
    """
    contexts = []
    for parent in parents:
        try:
            query_vec = _get_embedding(parent.title)
        except Exception:
            continue
        chunks = parent.search_faiss(query_vec, k=PARENT_CHUNK_K)
        if chunks:
            contexts.append({
                "title": parent.title,
                "context": "\n\n".join(chunks),
            })
    return contexts


def _validate_questions(questions: list) -> list[dict]:
    """Drop malformed questions."""
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
