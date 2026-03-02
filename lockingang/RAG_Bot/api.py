from __future__ import annotations

import importlib.util
import sys
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, List

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl


BASE_DIR = Path(__file__).resolve().parent
STARTER_PATH = BASE_DIR / "[Lodge_Lab] Starter.py"


def load_rag_module() -> Any:
    if "rag_starter" in sys.modules:
        return sys.modules["rag_starter"]
    if not STARTER_PATH.exists():
        raise FileNotFoundError(f"Starter file not found at {STARTER_PATH}")
    spec = importlib.util.spec_from_file_location("rag_starter", STARTER_PATH)
    if spec is None or spec.loader is None:
        raise ImportError("Failed to load starter module.")
    module = importlib.util.module_from_spec(spec)
    sys.modules["rag_starter"] = module
    spec.loader.exec_module(module)
    return module


rag = load_rag_module()

app = FastAPI(title="RAG Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str


class ScrapeRequest(BaseModel):
    url: HttpUrl


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/")
def root() -> dict:
    return {
        "message": "API is running. Open the React app at http://localhost:5173"
    }


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    question = (req.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    try:
        answer = rag.chat_with_rag(question)
        return ChatResponse(answer=answer)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/ingest-files")
def ingest_files(files: List[UploadFile] = File(...)) -> dict:
    try:
        # Create a temporary directory to store uploaded files
        with tempfile.TemporaryDirectory() as temp_dir:
            for file in files:
                file_path = os.path.join(temp_dir, file.filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
            
            # Ingest files from the temporary directory
            count = rag.ingest_files_from_folder(temp_dir)
            
        return {"files_processed": count}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/clear-db")
def clear_db(confirm: bool = False) -> dict:
    if not confirm:
        raise HTTPException(status_code=400, detail="Set confirm=true to proceed.")
    try:
        ok = rag.clear_database()
        return {"cleared": bool(ok)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/scrape")
def scrape(req: ScrapeRequest) -> dict:
    try:
        content = rag.scrape_website(str(req.url))
        if not content:
            raise HTTPException(status_code=400, detail="No content scraped.")
        chunks = rag.chunk_text(content, chunk_size=800, overlap=100)
        from urllib.parse import urlparse

        domain = urlparse(str(req.url)).netloc.replace("www.", "").replace(".", "-")
        for i, chunk in enumerate(chunks):
            rag.store_in_pinecone(chunk, domain, i)
        return {"chunks_stored": len(chunks), "source": domain}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


