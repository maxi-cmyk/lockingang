# RAG Chatbot — Setup & API Reference

A Retrieval-Augmented Generation (RAG) chatbot powered by **Pinecone**, **OpenAI**, and **FastAPI**.
Upload documents, scrape websites, and chat with your knowledge base through the web UI or the REST API.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Variables](#environment-variables)
3. [Running the App](#running-the-app)
4. [API Reference](#api-reference)
   - [Health Check](#get-health)
   - [Chat](#post-chat)
   - [Ingest Files](#post-ingest-files)
   - [Scrape Website](#post-scrape)
   - [Clear Database](#post-clear-db)
5. [Integrating the API](#integrating-the-api)
   - [Python](#python)
   - [JavaScript / TypeScript](#javascript--typescript)
   - [cURL](#curl)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Create and activate a virtual environment

```bash
# Create
python -m venv .venv

# Activate — Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Activate — Windows Command Prompt
.\.venv\Scripts\activate.bat

# Activate — Mac / Linux
source .venv/bin/activate
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

### 4. Configure environment variables

Create a `.env` file in the **project root**:

```env
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=my-first-rag
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
PINECONE_NAMESPACE=default
EMBED_MODEL=text-embedding-3-small
EMBED_DIMENSIONS=1024
CHAT_MODEL=gpt-4o-mini
```

> To use your **own** database, only change `OPENAI_API_KEY`, `PINECONE_API_KEY`, and `PINECONE_INDEX`. Everything else can stay the same.

---

## Running the App

Open **two terminals** side by side:

**Terminal 1 — API server**
```bash
uvicorn api:app --reload --port 8000
```

**Terminal 2 — Frontend dev server**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## API Reference

Base URL (development): `http://localhost:8000`

All request and response bodies use **JSON** unless noted.

---

### `GET /health`

Returns the health status of the API.

**Response**
```json
{ "status": "ok" }
```

---

### `POST /chat`

Send a question and receive an answer grounded in the knowledge base.

**Request body**

| Field      | Type   | Required | Description              |
|------------|--------|----------|--------------------------|
| `question` | string | Yes      | The question to ask.     |

```json
{ "question": "What is the refund policy?" }
```

**Response**

| Field    | Type   | Description                     |
|----------|--------|---------------------------------|
| `answer` | string | The RAG-generated answer.       |

```json
{ "answer": "Refunds are processed within 5–7 business days..." }
```

**Status codes**

| Code | Meaning                                  |
|------|------------------------------------------|
| 200  | Success                                  |
| 400  | `question` is empty                      |
| 500  | Upstream error (OpenAI / Pinecone)       |

---

### `POST /ingest-files`

Upload one or more files (PDF, TXT, MD) to add them to the knowledge base.

**Request** — `multipart/form-data`

| Field   | Type          | Required | Description                          |
|---------|---------------|----------|--------------------------------------|
| `files` | file[] (form) | Yes      | One or more files to ingest.         |

**Response**

| Field             | Type    | Description                        |
|-------------------|---------|------------------------------------|
| `files_processed` | integer | Number of files successfully ingested. |

```json
{ "files_processed": 3 }
```

**Status codes**

| Code | Meaning                            |
|------|------------------------------------|
| 200  | Success                            |
| 500  | Processing or storage error        |

---

### `POST /scrape`

Scrape a public website and store its content as chunks in the knowledge base.

**Request body**

| Field | Type   | Required | Description              |
|-------|--------|----------|--------------------------|
| `url` | string | Yes      | A valid `http(s)://` URL.|

```json
{ "url": "https://docs.example.com/guide" }
```

**Response**

| Field           | Type    | Description                            |
|-----------------|---------|----------------------------------------|
| `chunks_stored` | integer | Number of text chunks stored.          |
| `source`        | string  | Derived domain name used as source ID. |

```json
{ "chunks_stored": 12, "source": "docs-example-com" }
```

**Status codes**

| Code | Meaning                                  |
|------|------------------------------------------|
| 200  | Success                                  |
| 400  | No content could be scraped from the URL |
| 500  | Scraping or storage error                |

---

### `POST /clear-db`

Remove **all** stored chunks from the Pinecone index.

> This action is **irreversible**. You must pass `?confirm=true` as a query parameter.

**Query parameters**

| Parameter | Type    | Required | Description                       |
|-----------|---------|----------|-----------------------------------|
| `confirm` | boolean | Yes      | Must be `true` to proceed.        |

**Response**

| Field     | Type    | Description                    |
|-----------|---------|--------------------------------|
| `cleared` | boolean | `true` if the index was wiped. |

```json
{ "cleared": true }
```

**Status codes**

| Code | Meaning                          |
|------|----------------------------------|
| 200  | Success                          |
| 400  | `confirm` not set to `true`      |
| 500  | Pinecone error                   |

---

## Integrating the API

### Python

```python
import httpx

BASE = "http://localhost:8000"

# ── Chat ──────────────────────────────────────────────────────────────────
def ask(question: str) -> str:
    r = httpx.post(f"{BASE}/chat", json={"question": question})
    r.raise_for_status()
    return r.json()["answer"]

print(ask("What is the cancellation policy?"))

# ── Ingest files ──────────────────────────────────────────────────────────
def ingest(paths: list[str]) -> int:
    files = [("files", open(p, "rb")) for p in paths]
    r = httpx.post(f"{BASE}/ingest-files", files=files)
    r.raise_for_status()
    return r.json()["files_processed"]

print(ingest(["report.pdf", "notes.txt"]))

# ── Scrape a website ──────────────────────────────────────────────────────
def scrape(url: str) -> dict:
    r = httpx.post(f"{BASE}/scrape", json={"url": url})
    r.raise_for_status()
    return r.json()

print(scrape("https://docs.example.com"))

# ── Clear the database ────────────────────────────────────────────────────
def clear() -> bool:
    r = httpx.post(f"{BASE}/clear-db", params={"confirm": True})
    r.raise_for_status()
    return r.json()["cleared"]
```

---

### JavaScript / TypeScript

```ts
const BASE = "http://localhost:8000";

// ── Chat ──────────────────────────────────────────────────────────────────
async function ask(question: string): Promise<string> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return (await res.json()).answer;
}

// ── Ingest files ──────────────────────────────────────────────────────────
async function ingest(files: FileList): Promise<number> {
  const fd = new FormData();
  for (const file of files) fd.append("files", file);
  const res = await fetch(`${BASE}/ingest-files`, { method: "POST", body: fd });
  if (!res.ok) throw new Error((await res.json()).detail);
  return (await res.json()).files_processed;
}

// ── Scrape a website ──────────────────────────────────────────────────────
async function scrape(url: string) {
  const res = await fetch(`${BASE}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json(); // { chunks_stored, source }
}

// ── Clear the database ────────────────────────────────────────────────────
async function clearDb(): Promise<boolean> {
  const res = await fetch(`${BASE}/clear-db?confirm=true`, { method: "POST" });
  if (!res.ok) throw new Error((await res.json()).detail);
  return (await res.json()).cleared;
}
```

---

### cURL

```bash
# Health check
curl http://localhost:8000/health

# Chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the refund policy?"}'

# Ingest files
curl -X POST http://localhost:8000/ingest-files \
  -F "files=@report.pdf" \
  -F "files=@notes.txt"

# Scrape a website
curl -X POST http://localhost:8000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://docs.example.com"}'

# Clear the knowledge base (irreversible!)
curl -X POST "http://localhost:8000/clear-db?confirm=true"
```

---

## Troubleshooting

**PowerShell execution policy error**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**CORS errors in the browser**
The API allows all origins by default (`allow_origins=["*"]`). If you proxy through a different port, set the `VITE_API_BASE_URL` environment variable in `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
```

**Pinecone index not found**
Make sure `PINECONE_INDEX` in `.env` matches the index name you created in the Pinecone dashboard. The index dimensions must match `EMBED_DIMENSIONS` (default `1024`).

**OpenAI quota exceeded**
Check your usage at [platform.openai.com](https://platform.openai.com) and ensure your key has an active billing plan.

---

> Interactive API docs are available at **http://localhost:8000/docs** (Swagger UI) and **http://localhost:8000/redoc** while the server is running.
