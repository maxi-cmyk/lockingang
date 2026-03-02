"""
Telegram Bot Starter Kit (for the Week 4 RAG Chatbot)

What this bot does:
  - Receives a message from a Telegram user
  - Sends it to your local RAG API: POST {RAG_API_URL}/chat
  - Replies back to the user with the chatbot's response

This uses long-polling (no webhook), so it's the easiest setup for students.
"""

from __future__ import annotations

import os
from typing import Iterable

import httpx
from dotenv import load_dotenv
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)


# ==================== HELPER FUNCTIONS ====================
# Functions for configuration and validation

def _get_env(name: str, *, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None or not value.strip():
        raise RuntimeError(f"Missing environment variable: {name}")
    return value.strip()


def _parse_admin_ids(raw: str | None) -> set[int]:
    if not raw:
        return set()
    ids: set[int] = set()
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.add(int(part))
        except ValueError:
            raise RuntimeError(
                "TELEGRAM_ADMIN_IDS must be comma-separated integers. "
                f"Bad value: {part!r}"
            )
    return ids


# ==================== API COMMUNICATION ====================
# Functions to call the RAG chatbot backend

async def _call_rag_chat(api_url: str, message: str) -> str:
    """
    Calls the FastAPI endpoint implemented in `api.py`:
      POST /chat
      body: {"message": "..."}
      response: {"response": "..."}
    """
    timeout = httpx.Timeout(60.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(f"{api_url}/chat", json={"message": message})
        resp.raise_for_status()
        data = resp.json()
        if not isinstance(data, dict) or "response" not in data:
            raise RuntimeError("Unexpected API response format (expected JSON with 'response').")
        return str(data["response"])


# ==================== UTILITY FUNCTIONS ====================
# Helper functions for validation and authorization

def _is_admin(user_id: int | None, admin_ids: Iterable[int]) -> bool:
    return user_id is not None and user_id in set(admin_ids)


# ==================== TELEGRAM COMMAND HANDLERS ====================
# /start, /help, and other basic commands

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Hi! I’m connected to your RAG chatbot.\n\n"
        "Just send me a message and I’ll forward it to the RAG API.\n"
        "Type /help to see commands."
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Commands:\n"
        "  /start - Welcome message\n"
        "  /help - Show this help\n\n"
        "Admin-only commands (optional):\n"
        "  /ingest - Ingest local files into Pinecone\n"
        "  /scrape <url> - Scrape a website and store it\n"
        "  /clear_db - Clear Pinecone namespace (dangerous)\n"
    )


# ==================== ADMIN-ONLY COMMANDS ====================
# /ingest, /scrape, /clear_db - require admin authentication

async def ingest(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    api_url: str = context.bot_data["RAG_API_URL"]
    admin_ids: set[int] = context.bot_data["TELEGRAM_ADMIN_IDS"]
    if not _is_admin(update.effective_user.id if update.effective_user else None, admin_ids):
        await update.message.reply_text("Not allowed. Ask your instructor to add you as an admin.")
        return

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{api_url}/ingest")
            resp.raise_for_status()
            data = resp.json()
        await update.message.reply_text(f"Done: {data.get('message', 'Ingest completed')}")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


async def scrape(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    api_url: str = context.bot_data["RAG_API_URL"]
    admin_ids: set[int] = context.bot_data["TELEGRAM_ADMIN_IDS"]
    if not _is_admin(update.effective_user.id if update.effective_user else None, admin_ids):
        await update.message.reply_text("Not allowed. Ask your instructor to add you as an admin.")
        return

    if not context.args:
        await update.message.reply_text("Usage: /scrape https://example.com")
        return

    url = context.args[0].strip()
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{api_url}/scrape", json={"url": url})
            resp.raise_for_status()
            data = resp.json()
        await update.message.reply_text(f"Done: {data.get('message', 'Scrape completed')}")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


async def clear_db(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    api_url: str = context.bot_data["RAG_API_URL"]
    admin_ids: set[int] = context.bot_data["TELEGRAM_ADMIN_IDS"]
    if not _is_admin(update.effective_user.id if update.effective_user else None, admin_ids):
        await update.message.reply_text("Not allowed. Ask your instructor to add you as an admin.")
        return

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.delete(f"{api_url}/database")
            resp.raise_for_status()
            data = resp.json()
        await update.message.reply_text(f"Done: {data.get('message', 'Database cleared')}")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


# ==================== MESSAGE HANDLER ====================
# Processes regular user messages and sends them to the RAG API

async def on_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return

    api_url: str = context.bot_data["RAG_API_URL"]
    user_text = update.message.text.strip()

    if not user_text:
        await update.message.reply_text("Send some text and I’ll ask the RAG chatbot.")
        return

    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)

    try:
        answer = await _call_rag_chat(api_url, user_text)
        await update.message.reply_text(answer)
    except httpx.ConnectError:
        await update.message.reply_text(
            "I can’t reach the RAG API.\n"
            "Make sure your backend is running (Uvicorn/FastAPI), usually at http://localhost:8000."
        )
    except httpx.HTTPStatusError as e:
        await update.message.reply_text(f"API error: {e.response.status_code} {e.response.text}")
    except Exception as e:
        await update.message.reply_text(f"Error: {e}")


# ==================== BOT INITIALIZATION & MAIN ====================
# Sets up the bot, registers all handlers, and starts polling

def main() -> None:
    load_dotenv()

    token = _get_env("TELEGRAM_BOT_TOKEN")
    api_url = os.getenv("RAG_API_URL", "http://localhost:8000").strip()
    admin_ids = _parse_admin_ids(os.getenv("TELEGRAM_ADMIN_IDS"))

    app = Application.builder().token(token).build()

    app.bot_data["RAG_API_URL"] = api_url
    app.bot_data["TELEGRAM_ADMIN_IDS"] = admin_ids

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("ingest", ingest))
    app.add_handler(CommandHandler("scrape", scrape))
    app.add_handler(CommandHandler("clear_db", clear_db))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_message))

    print("Telegram bot is running (polling). Press Ctrl+C to stop.")
    print(f"Using RAG API: {api_url}")
    if admin_ids:
        print(f"Admin IDs enabled: {sorted(admin_ids)}")
    app.run_polling(close_loop=False)


if __name__ == "__main__":
    main()

