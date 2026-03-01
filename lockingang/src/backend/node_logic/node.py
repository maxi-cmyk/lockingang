from datetime import datetime
import os
import json
import re


# faiss and numpy are imported lazily inside methods so the class can be
# imported even if the packages are not yet installed.


FAISS_EMBED_DIM = 768          # Transformers.js vector size (techstack)
FAISS_INDEX_DIR = "data/faiss" # directory where per-node index files are stored


def _safe_filename(title: str) -> str:
    """Convert a node title to a safe filename prefix (strips special chars)."""
    return re.sub(r"[^\w\-]", "_", title).strip("_")


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

        TODO: implement PDF extraction via PyMuPDF (import fitz)
        TODO: implement OpenAI Vision OCR for 'image' file_type
        TODO: implement chunking helper (split text into 512-token windows with 64 overlap)
        TODO: call Transformers.js sidecar POST /embed for each chunk
        TODO: call faiss.normalize_L2(vec) before adding to the index
        TODO: call self._init_faiss_index() then self.faiss_index.add(vec)
        TODO: call self.save_faiss_index() after all chunks are indexed
        TODO: append file_path to self.notes and flush to SQLite
        """
        pass

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

        TODO: implement Kahoot API call — check if official API requires OAuth or use scraper
        TODO: implement OpenAI relevance scoring call for Kahoot results
        TODO: embed self.title via Transformers.js sidecar, normalise, call self.search_faiss(k=6)
        TODO: implement OpenAI quiz generation call with FAISS-retrieved chunks as context
        TODO: for Diamond nodes, call parent.search_faiss(k=3) for each parent and append synthesis questions
        TODO: return structured list of question dicts
        """
        pass

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

        TODO: call Transformers.js sidecar POST /embed with self.title, get 768-float vector
        TODO: faiss.normalize_L2(vec) then call self.search_faiss(vec, k=8)
        TODO: concatenate retrieved chunks into context string
        TODO: build the prompt and call OpenAI chat completions API
        TODO: return the markdown string
        """
        pass

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
        if not context:
            # STANDARD ACTIVE RECALL MODE
            # Goal: generate a single fresh comprehension question about self.title
            # grounded strictly in the student's own notes via this node's FAISS index.
            #
            # TODO: POST self.title to Transformers.js sidecar (http://localhost:5001/embed)
            #       to get a 768-float query vector; call faiss.normalize_L2(vec).
            # TODO: call self.search_faiss(vec, k=4) to pull the 4 most relevant chunks
            #       from this node's own FAISS index.
            # TODO: call OpenAI with retrieved chunks + prompt:
            #         "Generate one short-answer comprehension question about '{self.title}'
            #          based only on the provided notes. Return JSON:
            #          {question: str, hint: str, node_title: str}"
            # TODO: parse the JSON response and return the dict
            pass
        else:
            # REMEDIATION MODE — triggered after a wrong answer or Wall Detection (PRD §7)
            # Goal: generate a targeted question probing the specific misunderstanding
            # in `context`, using only this node's FAISS-indexed materials.
            #
            # TODO: POST `context` (the wrong answer / error description) to the
            #       Transformers.js sidecar to get a 768-float vector; normalise it.
            #       Using the mistake text as the query pulls chunks most relevant
            #       to what the student got wrong rather than the topic in general.
            # TODO: call self.search_faiss(vec, k=4) to retrieve the most relevant chunks
            #       from this node's FAISS index.
            # TODO: call OpenAI with retrieved chunks + prompt:
            #         "A student answered incorrectly. Their mistake: '{context}'.
            #          Generate one targeted follow-up question about '{self.title}'
            #          that directly addresses this misunderstanding.
            #          Return JSON: {question: str, hint: str, node_title: str}"
            # TODO: if self.is_wall() is True, signal the KnowledgeTree layer
            #       (e.g. raise a WallException or return a flag) so it can call
            #       generate_bridge_node(parent.title, self.title) automatically.
            # TODO: parse the JSON response and return the dict
            pass
