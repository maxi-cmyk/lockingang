"""
rag_engine.py — RAG logic: Pinecone retrieval + OpenAI generation.

Flow:
  1. Embed user query with text-embedding-3-small
  2. Query Pinecone index for top-K similar chunks (score > threshold)
  3. Build system prompt + injected context + conversation history
  4. Call GPT-4o and return the answer + list of source filenames
"""

import os
from openai import AsyncOpenAI

# ── Config (read from environment) ──────────────────────────────────────────
OPENAI_API_KEY     = os.getenv("OPENAI_API_KEY", "")
PINECONE_API_KEY   = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "lockingang-rag")

EMBED_MODEL  = "text-embedding-3-small"
EMBED_DIMS   = 1536
CHAT_MODEL   = "gpt-4o"
TOP_K        = 6
MIN_SCORE    = 0.30    # discard weak matches
MAX_HISTORY  = 8       # conversation turns to keep in context

SYSTEM_PROMPT = """You are NEURAL_LIAISON, an AI study assistant embedded in the LockInGang \
productivity app. You help students understand concepts, answer questions about their study \
materials, manage their schedule, and support active recall.

Guidelines:
- Be concise, precise, and encouraging.
- When relevant context from uploaded materials is provided, ground your answer in it and \
  cite the source filename naturally (e.g. "According to your lecture_notes.pdf...").
- If the provided context doesn't cover the question, say so briefly and answer from general \
  knowledge.
- Use clear formatting — short paragraphs, bullet lists when helpful.
- Occasionally address the student as "Marty" to keep the interaction personal.
- Never fabricate citations or invent facts not supported by context."""


class RAGEngine:
    """Manages embeddings, Pinecone upserts, and RAG-augmented chat completions."""

    def __init__(self):
        self._openai = AsyncOpenAI(api_key=OPENAI_API_KEY)
        self._index  = None
        self._pc     = None
        self._init_pinecone()

    # ── Pinecone setup ───────────────────────────────────────────────────────

    def _init_pinecone(self):
        if not PINECONE_API_KEY:
            print("[RAG] WARNING: PINECONE_API_KEY not set — running without vector retrieval.")
            return
        try:
            from pinecone import Pinecone, ServerlessSpec
            self._pc = Pinecone(api_key=PINECONE_API_KEY)

            existing_names = [idx.name for idx in self._pc.list_indexes()]
            if PINECONE_INDEX_NAME not in existing_names:
                self._pc.create_index(
                    name=PINECONE_INDEX_NAME,
                    dimension=EMBED_DIMS,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
                )
                print(f"[RAG] Created Pinecone index '{PINECONE_INDEX_NAME}'")

            self._index = self._pc.Index(PINECONE_INDEX_NAME)
            stats = self._index.describe_index_stats()
            print(
                f"[RAG] Pinecone ready — index '{PINECONE_INDEX_NAME}', "
                f"{stats.total_vector_count} vectors."
            )
        except Exception as exc:
            print(f"[RAG] Pinecone init error: {exc}")
            self._index = None

    def is_ready(self) -> bool:
        return self._index is not None

    # ── Embedding ────────────────────────────────────────────────────────────

    async def _embed(self, text: str) -> list[float]:
        resp = await self._openai.embeddings.create(
            input=text,
            model=EMBED_MODEL,
        )
        return resp.data[0].embedding

    # ── Ingestion ────────────────────────────────────────────────────────────

    async def ingest_chunks(self, chunks: list[dict], source: str) -> int:
        """Embed and upsert *chunks* into Pinecone.  Returns the number upserted."""
        if not self._index:
            print(f"[RAG] No index available — skipping ingest of {len(chunks)} chunks.")
            return 0

        vectors = []
        for chunk in chunks:
            embedding = await self._embed(chunk["text"])
            vectors.append({
                "id": chunk["id"],
                "values": embedding,
                "metadata": {
                    "text": chunk["text"],
                    "source": source,
                    "chunk_index": chunk.get("chunk_index", 0),
                },
            })

        # Pinecone recommends batches of ≤ 100 vectors
        BATCH = 100
        for i in range(0, len(vectors), BATCH):
            self._index.upsert(vectors=vectors[i : i + BATCH])

        print(f"[RAG] Upserted {len(vectors)} vectors for '{source}'.")
        return len(vectors)

    # ── Query + generation ───────────────────────────────────────────────────

    async def query(
        self, message: str, history: list[dict]
    ) -> tuple[str, list[str]]:
        """
        Retrieve relevant chunks from Pinecone, then generate an answer with GPT-4o.

        Returns:
            answer  — the assistant's response string
            sources — deduplicated list of source filenames cited
        """
        context_text = ""
        sources: list[str] = []

        if self._index:
            query_embedding = await self._embed(message)
            results = self._index.query(
                vector=query_embedding,
                top_k=TOP_K,
                include_metadata=True,
            )
            good_matches = [m for m in results.matches if m.score >= MIN_SCORE]

            if good_matches:
                context_parts: list[str] = []
                for match in good_matches:
                    meta = match.metadata or {}
                    src  = meta.get("source", "unknown")
                    text = meta.get("text", "").strip()
                    if src not in sources:
                        sources.append(src)
                    context_parts.append(f"[Source: {src}]\n{text}")
                context_text = "\n\n---\n\n".join(context_parts)

        # Build the message list for the chat completion
        messages: list[dict] = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

        if context_text:
            messages.append({
                "role": "system",
                "content": (
                    "The following excerpts are from the student's uploaded study materials. "
                    "Use them as your primary source of truth when answering.\n\n"
                    + context_text
                ),
            })

        # Inject the last N turns of conversation history
        for turn in history[-(MAX_HISTORY * 2):]:
            role = "assistant" if turn.get("from") == "bot" else "user"
            messages.append({"role": role, "content": turn.get("text", "")})

        # Current user message
        messages.append({"role": "user", "content": message})

        completion = await self._openai.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            temperature=0.35,
            max_tokens=900,
        )

        answer = completion.choices[0].message.content.strip()
        return answer, sources
