# Telegram Bot Starter Kit (Week 4 RAG)

This folder contains a **Telegram bot** that talks to your **Week 4 RAG chatbot backend** (FastAPI + Uvicorn).

The flow is:

1. You type a message in Telegram
2. The bot sends your message to the local RAG API: `POST http://localhost:8000/chat`
3. The RAG backend retrieves relevant context from Pinecone and generates a response
4. The bot replies to you in Telegram with the response

## What you need

- Python 3.8+ installed
- A Telegram bot token (from **@BotFather**)
- The Week 4 RAG backend running (the `api.py` file in the Week 4 kit)

## 1) Start the RAG backend (FastAPI)

In the **Week 4 RAG Starter Kit** project folder (the one with `api.py`), set up your `.env` for Pinecone/OpenAI as usual.

Then start the API server:

```powershell
python api.py
```

You should see something like:

- API running at `http://localhost:8000`
- (Optional) visit `http://localhost:8000/` to see a status JSON

## 2) Create your Telegram bot token

1. Open Telegram
2. Search for **@BotFather**
3. Run `/newbot`
4. Copy the token it gives you (looks like `123456:ABC...`)

Keep this token secret.

## 3) Set up this Telegram bot project

Open a terminal in this `Telegram Bot` folder.

### Create and activate a virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Install dependencies

```powershell
pip install -r requirements.txt
```

### Create your `.env`

Copy `.env.example` to `.env` and fill in your token:

```env
TELEGRAM_BOT_TOKEN=PASTE_YOUR_TOKEN_HERE
RAG_API_URL=http://localhost:8000
```

Optional: add admin IDs (so only instructors can run database commands):

```env
TELEGRAM_ADMIN_IDS=123456789,987654321
```

To find your Telegram numeric user ID:
- Use a bot like `@userinfobot`, or ask your instructor to show you how

## 4) Run the Telegram bot

```powershell
python bot.py
```

Now open your bot chat in Telegram and send a message.

## Commands

- Send any text message → forwards to the RAG API `/chat`
- `/start` → welcome message
- `/help` → list commands

Admin-only (requires `TELEGRAM_ADMIN_IDS`):
- `/ingest` → calls `POST /ingest` (ingests local PDFs/TXTs into Pinecone)
- `/scrape https://example.com` → calls `POST /scrape`
- `/clear_db` → calls `DELETE /database` (dangerous)

## Troubleshooting

### “I can’t reach the RAG API”

Make sure the backend is running:

- In the Week 4 RAG folder, run `python api.py`
- Confirm the API URL is correct:
  - Default: `http://localhost:8000`
  - In this bot folder, your `.env` must have `RAG_API_URL` set correctly

### PowerShell execution policy error (venv activation)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try activating again:

```powershell
.\.venv\Scripts\Activate.ps1
```

### The bot responds, but answers are “wrong”

RAG answers depend on what is stored in Pinecone.

Try:
- Run `/ingest` (admin) after placing PDFs/TXTs in the Week 4 kit’s `Files to insert (PDF or TXT)` folder
- Or use `/scrape <url>` (admin) to add website content

## Teacher notes (how to explain it)

- The Telegram bot is just a UI (like the React frontend).
- The “brain” is the FastAPI RAG backend.
- Telegram message → `POST /chat` → response returned → Telegram reply.

