"""
chatbot_server.py — FastAPI server for the LockInGang RAG chatbot.

Start with:
    cd src/backend/rag_chatbot
    pip install -r requirements.txt
    cp .env.example .env          # fill in OPENAI_API_KEY and PINECONE_API_KEY
    python chatbot_server.py

Endpoints:
    GET  /health         — liveness check
    POST /chat           — RAG chat completion
    POST /upload         — ingest a file into Pinecone
    POST /build-tree     — extract knowledge tree from a study document
"""

import json
import os
import re
import tempfile
from pathlib import Path

# Load .env file if present (safe no-op when the file is missing)
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).parent / ".env")
except ImportError:
    pass

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from document_processor import DocumentProcessor
from rag_engine import RAGEngine

# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="LockInGang RAG Chatbot", version="1.0.0")

# Allow requests from the Electron renderer (file:// origin or localhost vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise singletons (done once at import time)
rag = RAGEngine()
processor = DocumentProcessor()


# ── Schemas ──────────────────────────────────────────────────────────────────

class MessageTurn(BaseModel):
    """A single turn in the conversation history sent from the frontend."""
    model_config = {"populate_by_name": True}

    id:   str
    from_: str = Field("", alias="from")
    text: str = ""


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []   # raw dicts — forwarded directly to RAGEngine


class ChatResponse(BaseModel):
    response: str
    sources:  list[str] = []


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "pinecone_connected": rag.is_ready(),
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")
    try:
        answer, sources = await rag.query(req.message, req.history)
        return ChatResponse(response=answer, sources=sources)
    except Exception as exc:
        print(f"[CHAT] Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename or "upload"
    suffix   = Path(filename).suffix.lower()

    allowed = {".pdf", ".txt", ".md", ".markdown", ".docx", ".csv"}
    if suffix not in allowed:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(sorted(allowed))}",
        )

    # Write to a temp file so the processor can read it
    contents = await file.read()
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        chunks = processor.process_file(tmp_path, filename)
        if not chunks:
            raise HTTPException(status_code=422, detail="Could not extract any text from the file.")

        count = await rag.ingest_chunks(chunks, filename)

        return {
            "status":   "success",
            "filename": filename,
            "chunks":   count,
            "message":  f"Ingested {count} chunk(s) from \"{filename}\" into the knowledge base.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[UPLOAD] Error processing '{filename}': {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


# ── Knowledge-tree extraction ────────────────────────────────────────────────

_TREE_SYSTEM = (
    "You are an expert educator and knowledge-graph architect. "
    "Your job is to read study material and produce a precise, structured "
    "knowledge tree that a student can use for spaced-repetition learning."
)

_TREE_USER_TMPL = """Analyse the study material below and extract a knowledge tree.

Return ONLY a single JSON object — no markdown, no explanation — with this exact shape:
{{
  "subject": "<Overall subject / course name — becomes the root node>",
  "nodes": [
    {{"title": "CONCEPT_NAME", "description": "One or two sentence explanation."}}
  ],
  "edges": [
    {{"parent": "PARENT_TITLE", "child": "CHILD_TITLE", "type": "requires"}}
  ]
}}

Rules:
- Extract 6 to 15 key learnable concepts as nodes.
- Use UPPERCASE_WITH_UNDERSCORES for every title (e.g. BAYES_THEOREM).
- The subject is the root; its title must also appear in the nodes array.
- Edge types: "requires" (strict prerequisite), "related_to" (related concept), "is_a_type_of" (subcategory).
- List prerequisite edges first so the tree can be built top-down.
- Do not output anything outside the JSON object.

Material:
{text}"""


async def _extract_tree_from_text(text: str) -> dict:
    """Call OpenAI to turn raw document text into a nodes+edges dict."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

    # Trim to ~12 000 chars so we stay well inside the context window
    trimmed = text[:12_000]

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": _TREE_SYSTEM},
            {"role": "user",   "content": _TREE_USER_TMPL.format(text=trimmed)},
        ],
        temperature=0.2,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()
    return json.loads(raw)


@app.post("/build-tree")
async def build_tree(file: UploadFile = File(...)):
    """
    Extract a knowledge tree from an uploaded study document.

    Returns:
        {
            subject:   str,
            nodes:     [{title, description}],
            edges:     [{parent, child, type}],
            text_len:  int   (characters of text extracted)
        }
    """
    filename = file.filename or "upload"
    suffix   = Path(filename).suffix.lower()
    allowed  = {".pdf", ".txt", ".md", ".markdown", ".docx"}

    if suffix not in allowed:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported type '{suffix}' for tree building. Allowed: pdf, txt, md, docx",
        )

    contents = await file.read()
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        # Extract all text from the document
        chunks = processor.process_file(tmp_path, filename)
        if not chunks:
            raise HTTPException(status_code=422, detail="Could not extract text from this file.")

        full_text = "\n\n".join(c["text"] for c in chunks)

        # Also ingest into Pinecone so the chatbot can answer questions about it
        await rag.ingest_chunks(chunks, filename)

        # Ask OpenAI to extract the knowledge tree structure
        tree = await _extract_tree_from_text(full_text)

        # Validate minimal shape
        if "nodes" not in tree or "subject" not in tree:
            raise HTTPException(status_code=500, detail="OpenAI returned an unexpected tree shape.")

        # Ensure edges list exists
        tree.setdefault("edges", [])
        tree["text_len"] = len(full_text)

        print(
            f"[TREE] '{filename}' -> {len(tree['nodes'])} nodes, "
            f"{len(tree['edges'])} edges, subject='{tree['subject']}'"
        )
        return tree

    except HTTPException:
        raise
    except Exception as exc:
        print(f"[TREE] Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# ── Per-node AI: Summary + Quiz ──────────────────────────────────────────────

class NodeRequest(BaseModel):
    nodeId: str
    nodeLabel: str = ""
    description: str = ""


@app.post("/node-summary")
async def node_summary(req: NodeRequest):
    """Generate a 2-3 paragraph AI summary for a knowledge-tree node."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

    ctx = f" Context: {req.description}" if req.description else ""
    prompt = (
        f"Write a clear 2-3 paragraph educational summary of the topic '{req.nodeLabel}'.{ctx} "
        "Focus on what it is, why it matters for learning, and one key thing to remember."
    )
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert educator who writes clear, concise topic summaries."},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.4,
            max_tokens=400,
        )
        return {"summary": response.choices[0].message.content.strip()}
    except Exception as exc:
        print(f"[SUMMARY] Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/node-quiz")
async def node_quiz(req: NodeRequest):
    """Generate 5 multiple-choice questions for a knowledge-tree node."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

    ctx = f"\nTopic description: {req.description}" if req.description else ""
    prompt = (
        f"Generate 5 multiple-choice quiz questions for the topic: {req.nodeLabel}.{ctx}\n\n"
        "Return ONLY a JSON object with this exact shape:\n"
        '{"questions": [{"id": "q1", "text": "Question?", '
        '"context": "> Short technical context...", '
        '"options": [{"letter": "A", "text": "..."}, {"letter": "B", "text": "..."}, '
        '{"letter": "C", "text": "..."}, {"letter": "D", "text": "..."}], "correct": "A", '
        '"explanation": "A is correct because... The other options are wrong because..."}]}\n\n'
        "The explanation field must clearly state WHY the correct answer is right and why each wrong option is incorrect."
    )
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert educator. Generate precise, educational multiple-choice questions."},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as exc:
        print(f"[QUIZ] Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("CHATBOT_PORT", "5001"))
    print(f"[SERVER] Starting LockInGang RAG chatbot on http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
