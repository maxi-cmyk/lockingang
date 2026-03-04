# lockingang: AI Learning State Engine 🧠

lockingang is a local-first desktop application that solves the problem of passive, inefficient study for students and self-learners. Its core—the **Learning State Engine**—continuously models what a student knows, how fast they are forgetting it, and what single action they should take next to maximize long-term retention.

## 🌟 The Core Problem

Students spend hours re-reading notes passively without knowing which topics they are actually forgetting.

lockingang solves this by maintaining a live, per-topic knowledge score that decays in real-time. This drives personalized quiz selection, intelligent scheduling, and AI-generated guidance—all while adapting to long-term changes in learning behavior.

## ⚡ Features

### 🌳 Knowledge Tree (Primary Hub)

An interactive, zoomable graph where each node represents a topic and edges represent relationships.

- **Nodes:** Contains Competence Scores, Attached Notes, Quiz History, Decay Rates, and Status Indicators.
- **Visual Overlays:** "Fog of War" dims nodes below a competence threshold. The "Forgetting Forecast" projects 7-day decay heatmaps.
- **Auto-Generation from Content:** Upload a textbook, PDF, or notes, and the AI will extract key concepts and generate a complete tree structure automatically.

### 🧭 Dashboard & Focus Tunnel

Provides a read-only, at-a-glance summary of the student's current learning state.

- **The Rule of 3:** The active task queue has a hard limit of 3 tasks to enforce prioritization.
- **Zen Mode:** Distraction-free full-screen takeover.
- **Brain Dump:** offload intrusive thoughts to an Inbox without breaking focus.

### 🤖 Chatbot (Agentic AI Assistant)

A conversational AI assistant deeply integrated with the knowledge graph.

- **RAG-Powered Q&A:** Queries Pinecone using your embedded notes as the corpus.
- **Graph & Study Planning:** Can schedule events via natural language.

### 🗓 Auto-Scheduler & Calendar

Combines Google Calendar events with automatically scheduled review sessions.

- **Forgetting Curve Optimizer:** Projects when nodes will fall below a critical threshold (0.3) and generates optimal review slots.
- **Exam Preparation Mode:** Identifies relevant nodes, highlights gaps, and creates a customized multi-day plan.



---

## 🏗 Technical Stack

lockingang utilizes a fully local stack with selective cloud integrations to ensure privacy and zero-latency performance.

| Layer                | Technology                   | Purpose                                         |
| -------------------- | ---------------------------- | ----------------------------------------------- |
| **App Shell**        | Electron                     | Cross-platform desktop container                |
| **UI Framework**     | React + Tailwind CSS         | Minimalist, high-contrast interface             |
| **Backend Logic**    | Node.js                      | Core engine, scheduling, decay cycles           |
| **Knowledge Graph**  | getzep/graphiti              | Relationship modeling between concepts          |
| **AI (RAG/Vision)**  | OpenAI API                   | Quiz generation, content analysis               |
| **Vector Database**  | Pinecone DB                  | Used for RAG retrieval                          |
| **API for RAG**      | FastAPI                      | Separates the RAG AI system and frontend        |
| **On-Device Embeds** | Transformers.js (Web Worker) | 768-float semantic vectors, fully local         |
| **Database**         | SQLite + WAL mode            | Prevents locks during background decay cycles   |
| **External Quiz**    | Kahoot API / Scraping        | Sourcing community quiz content                 |

---

## 📐 Design Principles

1.  **Constraint over Freedom:** Limitations are features. The Rule of 3 prevents choice paralysis.
2.  **Active over Passive:** Re-reading is replaced by quizzes, and progress requires demonstrated understanding.
3.  **Visual over Textual:** The Fog of War, forgetting forecasts, and color-coded nodes make memory decay intuitive.
4.  **Compassion over Shame:** Failure is treated as structural data points (via bridge nodes), not personal flaws.
5.  **Explainable over Opaque:** Every recommendation comes with reasoning.
6.  **Adaptive over Static:** The system evolves its model of the student, handling bursts of activity and long gaps gracefully.


# LockInGang — Start Guide

Use **three terminals** (all from the project root).

---

## First-time setup (RAG chatbot only)

```powershell
cd c:\Users\USER\Downloads\DLW-2026-\lockingang\src\backend\rag_chatbot
pip install -r requirements.txt
copy .env.example .env        # then open .env and fill in your keys
```

Make a .env file in the lockingang folder with these three variables:
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
