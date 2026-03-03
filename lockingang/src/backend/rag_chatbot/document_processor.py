"""
document_processor.py — Reads and chunks documents for RAG ingestion.

Supported file types:
  .pdf           (via pypdf)
  .txt .md       (plain text / markdown)
  .docx          (via python-docx)
  .csv           (via csv module)
  anything else  (attempted as UTF-8 text)
"""

import csv
import hashlib
import os
import re
from pathlib import Path

# ── Tuning ──────────────────────────────────────────────────────────────────
CHUNK_SIZE = 600        # characters per chunk  (~150 tokens)
CHUNK_OVERLAP = 100     # overlap between consecutive chunks


# ── Helpers ─────────────────────────────────────────────────────────────────

def _chunk_text(text: str, source: str) -> list[dict]:
    """Split *text* into overlapping fixed-size chunks.

    Returns a list of dicts:
        { id, text, chunk_index, source }
    """
    # Normalise excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        return []

    chunks: list[dict] = []
    start = 0
    idx = 0

    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        fragment = text[start:end].strip()
        if fragment:
            # Stable deterministic ID: source + index + content hash
            content_hash = hashlib.md5(fragment.encode()).hexdigest()[:8]
            safe_source = re.sub(r"[^\w\-.]", "_", source)
            chunk_id = f"{safe_source}_{idx}_{content_hash}"
            chunks.append({
                "id": chunk_id,
                "text": fragment,
                "chunk_index": idx,
                "source": source,
            })
            idx += 1

        # Slide window forward, keeping overlap unless we've reached the end
        start = (end - CHUNK_OVERLAP) if end < len(text) else end

    return chunks


# ── Main class ───────────────────────────────────────────────────────────────

class DocumentProcessor:
    """Reads a file and returns a list of chunk dicts ready for embedding."""

    def process_file(self, file_path: str, original_name: str) -> list[dict]:
        suffix = Path(original_name).suffix.lower()

        if suffix == ".pdf":
            text = self._read_pdf(file_path)
        elif suffix in (".txt", ".md", ".markdown"):
            text = self._read_text(file_path)
        elif suffix == ".docx":
            text = self._read_docx(file_path)
        elif suffix == ".csv":
            text = self._read_csv(file_path)
        else:
            # Best-effort plain-text fallback
            text = self._read_text(file_path)

        return _chunk_text(text, original_name)

    # ── Readers ──────────────────────────────────────────────────────────────

    def _read_pdf(self, path: str) -> str:
        try:
            from pypdf import PdfReader
        except ImportError:
            raise RuntimeError(
                "pypdf is required for PDF support — run: pip install pypdf"
            )
        reader = PdfReader(path)
        pages = []
        for page in reader.pages:
            extracted = page.extract_text() or ""
            pages.append(extracted)
        return "\n\n".join(pages)

    def _read_text(self, path: str) -> str:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            return fh.read()

    def _read_docx(self, path: str) -> str:
        try:
            import docx
        except ImportError:
            raise RuntimeError(
                "python-docx is required for DOCX support — run: pip install python-docx"
            )
        doc = docx.Document(path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)

    def _read_csv(self, path: str) -> str:
        rows: list[str] = []
        with open(path, newline="", encoding="utf-8", errors="replace") as fh:
            reader = csv.reader(fh)
            for row in reader:
                rows.append(", ".join(cell.strip() for cell in row))
        return "\n".join(rows)
