from datetime import datetime
import os
import json
import re
import base64
import requests


# faiss and numpy are imported lazily inside methods so the class can be
# imported even if the packages are not yet installed.


FAISS_EMBED_DIM = 768          # Transformers.js vector size (techstack)
FAISS_INDEX_DIR = "data/faiss" # directory where per-node index files are stored
EMBED_SIDECAR_URL = "http://localhost:5001/embed"
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
CHUNK_WORD_WINDOW = 400
CHUNK_WORD_OVERLAP = 50


def _safe_filename(title: str) -> str:
    """Convert a node title to a safe filename prefix (strips special chars)."""
    return re.sub(r"[^\w\-]", "_", title).strip("_")


def _chunk_text(text: str, chunk_size_words: int = CHUNK_WORD_WINDOW, overlap_words: int = CHUNK_WORD_OVERLAP) -> list[str]:
    """Split text into overlapping word windows for embedding."""
    words = text.split()
    if not words:
        return []
    if chunk_size_words <= 0:
        raise ValueError("chunk_size_words must be > 0")
    if overlap_words < 0 or overlap_words >= chunk_size_words:
        raise ValueError("overlap_words must be >= 0 and < chunk_size_words")

    stride = chunk_size_words - overlap_words
    chunks = []
    for i in range(0, len(words), stride):
        window = words[i:i + chunk_size_words]
        if not window:
            break
        chunks.append(" ".join(window))
        if i + chunk_size_words >= len(words):
            break
    return chunks


def _extract_json_payload(raw: str):
    """Parse JSON from a model response, tolerating fenced code blocks."""
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError("Response did not contain valid JSON payload")


class node:
    """
    Atomic unit of the Knowledge Tree.
    Tracks competence, decay, quiz history, and relationships to other nodes.
    Each node owns its own FAISS index so RAG queries are scoped
    exclusively to that concept's materials.
    """

    VALID_RELATIONSHIPS = {"requires", "is_a_type_of", "related_to", "bridges_to"}

    def __init__(self, title: str, decay_rate: float = 0.05):
        self.title = title
        self.mastery = 0.0                   # stored score (0.0–1.0), reset on each quiz
        self.decay_rate = decay_rate         # per-node; influenced by complexity & history
        self.last_reviewed = datetime.now()  # timestamp when score was last written
        self.notes = []                      # attached content: markdown text, PDF paths, image paths
        self.quiz_history = []               # list of {timestamp, score, correct} dicts
        self.parents = []                    # parent node objects
        self.children = []                   # child node objects
        self.edges = []                      # {target: node, type: relationship_str}
        self.fail_count = 0                  # consecutive failures — drives Wall Detection
        self.scheduled_quiz = None           # datetime of next calendar-scheduled review

        # ------------------------------------------------------------------
        # Per-node FAISS vector store
        # faiss_index  — IndexFlatIP index holding 768-float embeddings
        # faiss_chunks — parallel list of raw text strings; index i in this
        #                list corresponds to vector i in faiss_index.
        #                FAISS only stores vectors, not metadata, so we keep
        #                the text alongside it here.
        # ------------------------------------------------------------------
        self.faiss_index = None              # initialised lazily on first upload_notes call
        self.faiss_chunks: list[str] = []    # raw chunk strings mirroring faiss_index rows

    # ------------------------------------------------------------------
    # Forgetting curve
    # ------------------------------------------------------------------

    def get_live_score(self) -> float:
        """
        Real-time competence: stored_score × (1 − decay_rate) ^ days_elapsed
        As defined in PRD §8.
        """
        days_elapsed = (datetime.now() - self.last_reviewed).total_seconds() / 86400
        live = self.mastery * ((1 - self.decay_rate) ** days_elapsed)
        return max(0.0, round(live, 4))

    def get_status(self) -> str:
        """
        Color-coded node health based on live score (PRD §3.1):
          blue   — mastered  (> 0.7)
          yellow — fading    (0.3 – 0.7)
          red    — critical  (< 0.3)
        """
        score = self.get_live_score()
        if score > 0.7:
            return "blue"
        elif score >= 0.3:
            return "yellow"
        else:
            return "red"

    # ------------------------------------------------------------------
    # FAISS helpers
    # ------------------------------------------------------------------

    def _init_faiss_index(self):
        """Lazily create the FAISS IndexFlatIP for this node if it does not exist yet."""
        import faiss
        if self.faiss_index is None:
            # IndexFlatIP: exact inner-product search.
            # Normalise all vectors to unit length before adding so that
            # inner product == cosine similarity.
            self.faiss_index = faiss.IndexFlatIP(FAISS_EMBED_DIM)

    def search_faiss(self, query_vector, k: int = 6) -> list[str]:
        """
        Return the top-k most relevant text chunks for a given query vector.
        query_vector must be a numpy float32 array of shape (1, FAISS_EMBED_DIM),
        normalised to unit length.
        Returns a list of raw chunk strings ordered by similarity descending.
        """
        import numpy as np
        if self.faiss_index is None or self.faiss_index.ntotal == 0:
            return []
        k = min(k, self.faiss_index.ntotal)
        _, indices = self.faiss_index.search(query_vector, k)
        return [self.faiss_chunks[i] for i in indices[0] if i != -1]

    def save_faiss_index(self):
        """
        Persist this node's FAISS index and chunk list to disk so they
        survive app restarts.

        Files written to FAISS_INDEX_DIR:
          {safe_title}.faiss       — the binary FAISS index
          {safe_title}_chunks.json — the parallel chunk text list
        """
        import faiss
        if self.faiss_index is None:
            return
        os.makedirs(FAISS_INDEX_DIR, exist_ok=True)
        prefix = os.path.join(FAISS_INDEX_DIR, _safe_filename(self.title))
        faiss.write_index(self.faiss_index, f"{prefix}.faiss")
        with open(f"{prefix}_chunks.json", "w") as f:
            json.dump(self.faiss_chunks, f)

    def load_faiss_index(self):
        """
        Load a previously saved FAISS index and chunk list from disk.
        Call this when rehydrating a node from SQLite on app startup.
        """
        import faiss
        prefix = os.path.join(FAISS_INDEX_DIR, _safe_filename(self.title))
        index_path = f"{prefix}.faiss"
        chunks_path = f"{prefix}_chunks.json"
        if os.path.exists(index_path) and os.path.exists(chunks_path):
            self.faiss_index = faiss.read_index(index_path)
            with open(chunks_path) as f:
                self.faiss_chunks = json.load(f)

    def delete_faiss_index(self):
        """
        Delete this node's FAISS index files from disk.
        Called by KnowledgeTree.remove_node() to avoid orphaned index files.
        """
        prefix = os.path.join(FAISS_INDEX_DIR, _safe_filename(self.title))
        for ext in [".faiss", "_chunks.json"]:
            path = f"{prefix}{ext}"
            if os.path.exists(path):
                os.remove(path)
        self.faiss_index = None
        self.faiss_chunks = []

    # ------------------------------------------------------------------
    # Note ingestion
    # ------------------------------------------------------------------

    def upload_notes(self, file_path: str, file_type: str = "markdown"):
        """
        Attach a note file to this node and index it into this node's
        own FAISS vector store for RAG retrieval.

        Supported file_type values: 'markdown', 'pdf', 'image', 'plaintext'

        Steps:
          1. VALIDATION
             - Confirm file_path exists on disk and file_type is supported.
             - Raise ValueError for unsupported types, FileNotFoundError if missing.

          2. TEXT EXTRACTION
             - 'pdf':       extract text page-by-page using PyMuPDF (import fitz).
                            `text = "".join(page.get_text() for page in fitz.open(file_path))`
             - 'image':     call OpenAI Vision API:
                            send the image as base64 with prompt
                            "Extract all text from this image verbatim."
             - 'markdown' / 'plaintext': open and read directly.

          3. CHUNKING
             - Split the extracted text into overlapping windows:
               chunk_size = 512 tokens (~400 words), overlap = 64 tokens (~50 words).
             - Simple approach: split on whitespace, slice with stride.
             - Each chunk is a plain string stored in self.faiss_chunks.

          4. EMBEDDING
             - For each chunk, call the Transformers.js sidecar
               (POST http://localhost:5001/embed, body: {"text": chunk})
               which returns a 768-float vector.
             - Convert the response to numpy float32, shape (1, 768).
             - L2-normalise the vector so inner product == cosine similarity:
               `faiss.normalize_L2(vec)`

          5. FAISS INDEXING (per-node)
             - Call self._init_faiss_index() to create the index if not yet done.
             - Add the normalised vector: `self.faiss_index.add(vec)`
             - Append the raw chunk string: `self.faiss_chunks.append(chunk)`
             - Vector i in faiss_index always corresponds to faiss_chunks[i].

          6. PERSIST
             - Call self.save_faiss_index() to write the updated index to disk
               ({safe_title}.faiss + {safe_title}_chunks.json in FAISS_INDEX_DIR).
             - Append file_path to self.notes so the Notes View can render it.
             - Persist the updated self.notes list to SQLite via the db layer.

        Note list persistence to SQLite is handled by the caller layer
        (see node_logic/main.py upload_notes -> _persist_node).
        """
        supported_types = {"markdown", "pdf", "image", "plaintext"}
        if file_type not in supported_types:
            raise ValueError(
                f"Unsupported file_type '{file_type}'. Must be one of {supported_types}."
            )
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Note file not found: {file_path}")

        if file_type == "pdf":
            import fitz
            doc = fitz.open(file_path)
            try:
                extracted_text = "".join(page.get_text() for page in doc)
            finally:
                doc.close()
        elif file_type == "image":
            extracted_text = self._extract_text_from_image(file_path)
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()

        if not extracted_text or not extracted_text.strip():
            raise ValueError(f"No extractable text found in '{file_path}'.")

        chunks = _chunk_text(extracted_text)
        if not chunks:
            raise ValueError(f"Unable to chunk extracted text for '{file_path}'.")

        self._init_faiss_index()
        for chunk in chunks:
            vec = self._get_embedding(chunk)
            self.faiss_index.add(vec)
            self.faiss_chunks.append(chunk)

        self.save_faiss_index()

        if file_path not in self.notes:
            self.notes.append(file_path)

    # ------------------------------------------------------------------
    # Graph relationships
    # ------------------------------------------------------------------

    def set_child(self, child_node, relationship: str = "related_to"):
        """
        Link a child node with a labeled, directed edge.
        Valid types: requires | is_a_type_of | related_to | bridges_to  (PRD §3.1)
        """
        if relationship not in self.VALID_RELATIONSHIPS:
            raise ValueError(
                f"Unknown relationship '{relationship}'. "
                f"Must be one of: {self.VALID_RELATIONSHIPS}"
            )
        self.children.append(child_node)
        self.edges.append({"target": child_node, "type": relationship})
        child_node.parents.append(self)

    # ------------------------------------------------------------------
    # Quiz scoring & adaptive logic
    # ------------------------------------------------------------------

    def update_score(self, correct: bool) -> float:
        """
        Record a quiz attempt and update the competence score (PRD §4):
          correct   → 1.0
          incorrect → 0.2
        Resets the decay clock. Returns the new stored score.
        """
        new_score = 1.0 if correct else 0.2
        self.mastery = new_score
        self.last_reviewed = datetime.now()

        self.quiz_history.append({
            "timestamp": self.last_reviewed.isoformat(),
            "score": new_score,
            "correct": correct,
        })

        # Wall Detection counter (PRD §7)
        if correct:
            self.fail_count = 0
        else:
            self.fail_count += 1

        return new_score

    def is_wall(self) -> bool:
        """
        True when the student has failed this node's quiz 3+ consecutive times
        while the parent node still shows mastery (> 0.7) — PRD §7.
        The caller is responsible for checking the parent's score.
        """
        return self.fail_count >= 3

    # ------------------------------------------------------------------
    # AI-powered generation
    # ------------------------------------------------------------------

    def gen_quiz(self):
        """
        Build a quiz for this node (PRD §4).
        Returns a list of question dicts: {question, options, answer, explanation}

        Full flow:
          1. KAHOOT SEARCH
             - Query the Kahoot API (or scraper fallback) with self.title as the search term.
             - Retrieve the top N result quizzes (suggest N=5).

          2. KAHOOT EVALUATION
             - For each Kahoot result, send its question list + self.title to OpenAI.
             - Ask OpenAI to score relevance (0–1) and estimated difficulty level.
             - Accept the quiz if relevance >= 0.7; adapt/reword questions if needed.
             - If a suitable Kahoot is found, return its questions (adapted) and stop here.

          3. RAG FALLBACK — triggered when no Kahoot scores >= 0.7
             - Embed self.title via the Transformers.js sidecar
               (POST http://localhost:5001/embed) to get a 768-float query vector.
             - L2-normalise the vector then call self.search_faiss(query_vec, k=6)
               to retrieve the top 6 most relevant chunks from this node's own
               FAISS index (no cross-node contamination).
             - Pass retrieved chunks + self.title to OpenAI with a prompt instructing it
               to generate 5–10 multiple-choice questions strictly grounded in the material.
             - Each question must include: question text, 4 options (A–D),
               the correct answer key, and a one-sentence explanation citing the source chunk.

          4. SYNTHESIS QUIZ CHECK (Diamond Problem — PRD §4)
             - If len(self.parents) >= 2, this is a Diamond node.
             - For each parent, embed the parent's title and call
               parent.search_faiss(query_vec, k=3) to pull context from
               the parent's own FAISS index.
             - Append 1–2 synthesis questions that require integrating
               knowledge from both parents, using retrieved chunks from each.
             - Prompt: "Generate a synthesis question requiring understanding of both
               '{parent_1.title}' and '{parent_2.title}' as they relate to '{self.title}'."

        """
        questions = []

        # 1-2) Kahoot path first
        try:
            from kahoot.search import search as kahoot_search
            from kahoot.evaluator import pick_best
            from kahoot.adapter import adapt, filter_duplicates

            kahoot_candidates = kahoot_search(self.title, limit=5)
            best = pick_best(kahoot_candidates, self.title)
            if best:
                questions = filter_duplicates(adapt(best))
        except Exception:
            questions = []

        # 3) RAG fallback
        if not questions:
            try:
                from quiz_generation.rag_quiz import generate as rag_generate
                questions = rag_generate(self)
            except Exception:
                questions = self._generate_rag_quiz_locally()

        # 4) Diamond synthesis
        if len(self.parents) >= 2:
            synthesis_questions = []
            try:
                from quiz_generation.synthesis import generate as synth_generate
                synthesis_questions = synth_generate(self)
            except Exception:
                synthesis_questions = self._generate_synthesis_locally()
            questions.extend(synthesis_questions)

        questions = self._validate_questions(questions)
        return self._dedupe_questions(questions)

    def gen_summary(self):
        """
        Produce a concise concept summary using this node's attached notes (PRD §3.1).
        Returns a markdown-formatted string rendered in the Notes View panel.

        Steps:
          1. Embed self.title via the Transformers.js sidecar
             (POST http://localhost:5001/embed) to get a 768-float query vector.
             L2-normalise the vector with faiss.normalize_L2(vec).
          2. Call self.search_faiss(query_vec, k=8) to retrieve the 8 most
             relevant chunks from this node's own FAISS index.
             FAISS returns chunks already ordered by cosine similarity descending,
             so no additional sorting is needed.
          3. Concatenate the retrieved chunks into a single context string.
          4. Call OpenAI (gpt-4o recommended) with a prompt such as:
               "You are a study assistant. Using only the provided notes,
                write a concise markdown summary of '{self.title}'.
                Include: a 2-3 sentence overview, key definitions, and
                3–5 bullet points of the most important concepts.
                Do not add information not present in the notes."
          5. Return the response text as a markdown string for the UI to render
             with syntax highlighting.

        """
        query_vec = self._get_embedding(self.title)
        chunks = self.search_faiss(query_vec, k=8)
        if not chunks:
            return (
                f"## {self.title}\n\n"
                "No indexed notes were found for this node yet. "
                "Upload notes first so a grounded summary can be generated."
            )

        context = "\n\n---\n\n".join(chunks)
        prompt = (
            f"You are a study assistant. Using only the provided notes, write a concise "
            f"markdown summary of '{self.title}'.\n"
            "Include:\n"
            "- A 2-3 sentence overview\n"
            "- Key definitions\n"
            "- 3-5 bullet points of the most important concepts\n"
            "Do not add information not present in the notes.\n\n"
            f"Notes:\n{context}"
        )
        return self._chat_text(prompt)

    def ask_qn(self, context: str = ""):
        """
        Generate an active-recall question about this node (PRD §4 / §7).

        context = ""  → standard mode: a fresh comprehension question on self.title,
                        grounded in self.notes via the RAG pipeline.
        context = str → remediation mode: targeted question that probes the specific
                        misunderstanding described in `context` (triggered after a wrong
                        answer or Wall Detection).
        Returns a question dict: {question, hint, node_title}
        """
        query_text = context.strip() if context else self.title
        query_vec = self._get_embedding(query_text)
        chunks = self.search_faiss(query_vec, k=4)

        if not chunks:
            return {
                "question": f"What is the core idea of '{self.title}'?",
                "hint": "Upload notes for this node to get grounded active-recall questions.",
                "node_title": self.title,
                "wall_detected": self.is_wall() if context else False,
            }

        notes_context = "\n\n---\n\n".join(chunks)
        if not context:
            prompt = (
                f"Generate one short-answer comprehension question about '{self.title}' "
                "based only on the provided notes.\n"
                "Return ONLY JSON: "
                '{"question": str, "hint": str, "node_title": str}\n\n'
                f"Notes:\n{notes_context}"
            )
        else:
            prompt = (
                f"A student answered incorrectly. Their mistake: '{context}'.\n"
                f"Generate one targeted follow-up question about '{self.title}' that directly "
                "addresses this misunderstanding using only the provided notes.\n"
                "Return ONLY JSON: "
                '{"question": str, "hint": str, "node_title": str}\n\n'
                f"Notes:\n{notes_context}"
            )

        result = self._chat_json(prompt)
        question = {
            "question": result.get("question", "").strip(),
            "hint": result.get("hint", "").strip(),
            "node_title": result.get("node_title", self.title).strip() or self.title,
        }
        if not question["question"]:
            question["question"] = f"Explain '{self.title}' in your own words."
        if not question["hint"]:
            question["hint"] = "Focus on definitions and key relationships."
        if context:
            question["wall_detected"] = self.is_wall()
        return question

    # ------------------------------------------------------------------
    # Internal AI helpers
    # ------------------------------------------------------------------

    def _get_openai_client(self):
        from openai import OpenAI

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "OPENAI_API_KEY is not set. Add it to your environment or .env."
            )
        return OpenAI(api_key=api_key)

    def _chat_text(self, prompt: str) -> str:
        client = self._get_openai_client()
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        return (response.choices[0].message.content or "").strip()

    def _chat_json(self, prompt: str) -> dict:
        client = self._get_openai_client()
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or "{}"
        payload = _extract_json_payload(content)
        if not isinstance(payload, dict):
            raise ValueError("Expected JSON object in OpenAI response.")
        return payload

    def _get_embedding(self, text: str):
        import numpy as np
        import faiss

        response = requests.post(EMBED_SIDECAR_URL, json={"text": text}, timeout=15)
        response.raise_for_status()
        data = response.json()
        vector = data.get("vector")
        if not isinstance(vector, list) or len(vector) != FAISS_EMBED_DIM:
            raise ValueError(
                f"Embedding service returned invalid vector shape (expected {FAISS_EMBED_DIM})."
            )
        arr = np.array([vector], dtype=np.float32)
        faiss.normalize_L2(arr)
        return arr

    def _extract_text_from_image(self, file_path: str) -> str:
        ext = os.path.splitext(file_path)[1].lower()
        mime = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
        }.get(ext, "image/png")

        with open(file_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")

        prompt = "Extract all readable text from this image verbatim."
        client = self._get_openai_client()
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"},
                        },
                    ],
                }
            ],
        )
        return (response.choices[0].message.content or "").strip()

    def _generate_rag_quiz_locally(self) -> list[dict]:
        query_vec = self._get_embedding(self.title)
        chunks = self.search_faiss(query_vec, k=6)
        if not chunks:
            return []

        context = "\n\n---\n\n".join(chunks)
        prompt = (
            f"You are generating a quiz for a student studying '{self.title}'.\n"
            "Using ONLY the notes below, generate 5 multiple-choice questions.\n"
            "Each question must have 4 options labelled A, B, C, D.\n"
            "Return ONLY JSON with key 'questions' and list items as:\n"
            '{"question": str, "options": {"A": str, "B": str, "C": str, "D": str}, '
            '"answer": "A|B|C|D", "explanation": str}\n\n'
            f"Notes:\n{context}"
        )
        payload = self._chat_json(prompt)
        questions = payload if isinstance(payload, list) else payload.get("questions", [])
        return self._validate_questions(questions)

    def _generate_synthesis_locally(self) -> list[dict]:
        if len(self.parents) < 2:
            return []
        parent_contexts = []
        for parent in self.parents[:2]:
            try:
                query_vec = self._get_embedding(parent.title)
            except Exception:
                continue
            chunks = parent.search_faiss(query_vec, k=3)
            if chunks:
                parent_contexts.append({"title": parent.title, "context": "\n\n".join(chunks)})

        if len(parent_contexts) < 2:
            return []

        p1, p2 = parent_contexts[0], parent_contexts[1]
        prompt = (
            f"Generate 2 synthesis multiple-choice questions for '{self.title}' that require "
            f"knowledge from BOTH '{p1['title']}' and '{p2['title']}'.\n"
            "Each must have options A-D and one correct answer.\n"
            "Return ONLY JSON with key 'questions'.\n\n"
            f"{p1['title']} notes:\n{p1['context']}\n\n"
            f"{p2['title']} notes:\n{p2['context']}"
        )
        payload = self._chat_json(prompt)
        questions = payload if isinstance(payload, list) else payload.get("questions", [])
        return self._validate_questions(questions)

    def _validate_questions(self, questions: list) -> list[dict]:
        valid = []
        required = {"A", "B", "C", "D"}
        for q in questions or []:
            if not isinstance(q, dict):
                continue
            if not q.get("question"):
                continue
            options = q.get("options", {})
            if not isinstance(options, dict) or not required.issubset(options.keys()):
                continue
            answer = q.get("answer")
            if answer not in required:
                continue
            valid.append(
                {
                    "question": q["question"],
                    "options": {k: str(options[k]) for k in ("A", "B", "C", "D")},
                    "answer": answer,
                    "explanation": str(q.get("explanation", "")),
                }
            )
        return valid

    def _dedupe_questions(self, questions: list[dict]) -> list[dict]:
        seen = set()
        unique = []
        for q in questions:
            key = q.get("question", "").strip().lower()
            if key and key not in seen:
                seen.add(key)
                unique.append(q)
        return unique
