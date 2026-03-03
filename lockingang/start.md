# LockInGang — Start Guide

Use **three terminals** (all from the project root).

---

## First-time setup (RAG chatbot only)

```powershell
cd c:\Users\USER\Downloads\DLW-2026-\lockingang\src\backend\rag_chatbot
pip install -r requirements.txt
copy .env.example .env        # then open .env and fill in your keys
```

`.env` values you need:
```
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=lockingang-rag
```

---

## Every day — dev start

### Terminal 1 — Node logic backend

```powershell
cd c:\Users\USER\Downloads\DLW-2026-\lockingang
python src/backend/node_logic/main.py
```

### Terminal 2 — RAG chatbot backend

```powershell
cd c:\Users\USER\Downloads\DLW-2026-\lockingang\src\backend\rag_chatbot
python chatbot_server.py
```

> Server starts on **http://127.0.0.1:5001**
> You should see: `[SERVER] Starting LockInGang RAG chatbot on http://127.0.0.1:5001`

### Terminal 3 — Frontend (Electron + Vite)

```powershell
cd c:\Users\USER\Downloads\DLW-2026-\lockingang
Stop-Process -Id 24816 -Force   # only if port 5173 is still busy from a previous run
npm run dev
```

---

## Notes

- The Electron app will **auto-start** the RAG chatbot server on launch (Terminal 2 is optional if you let Electron manage it — but running it manually gives you visible logs).
- The chatbot **Pinecone index** is created automatically on first run if it doesn't exist.
- Attached files (PDF, DOCX, TXT, MD, CSV) are chunked and stored in Pinecone the moment you click **INGEST** in the chat UI.
