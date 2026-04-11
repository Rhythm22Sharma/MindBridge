"""
MindBridge FastAPI backend.

Endpoints:
  POST /upload        — ingest a PDF or .txt file
  POST /chat/stream   — streaming SSE chat response
  POST /chat/reset    — clear conversation history
  GET  /health        — health check
"""

import os
import logging
import tempfile
import shutil
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

if not os.getenv("GROQ_API_KEY"):
    raise RuntimeError("GROQ_API_KEY is not set. Copy .env.example to .env and add your key.")

from ingestor import ingest_document, collection_is_empty
from rag_chain import stream_chat, clear_history

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="MindBridge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".pdf", ".txt"}
MAX_FILE_SIZE_MB = 50


class ChatRequest(BaseModel):
    question: str
    session_id: str = "default"


class ResetRequest(BaseModel):
    session_id: str = "default"


@app.get("/health")
def health(session_id: str = "default"):
    return {"status": "ok", "document_loaded": not collection_is_empty(session_id)}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...), session_id: str = "default"):
    """
    Accept a PDF or .txt file, chunk + embed it into ChromaDB.
    Returns ingestion stats.
    """
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Only PDF and .txt are accepted.",
        )

    # Stream to a temp file — avoids loading large PDFs fully into RAM
    tmp_dir = tempfile.mkdtemp()
    # Use a safe fixed filename — original filename may contain spaces or
    # special chars that break path handling on some OS
    tmp_path = os.path.join(tmp_dir, "upload" + suffix)

    try:
        size_bytes = 0
        with open(tmp_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                size_bytes += len(chunk)
                if size_bytes > MAX_FILE_SIZE_MB * 1024 * 1024:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Max size is {MAX_FILE_SIZE_MB}MB.",
                    )
                f.write(chunk)

        logger.info("Received file: %s (%.1f MB)", file.filename, size_bytes / 1e6)
        stats = ingest_document(tmp_path, file.filename, session_id=session_id)
        clear_history(session_id)
        return {
            "status": "success",
            "filename": file.filename,
            "pages": stats["pages"],
            "chunks": stats["chunks"],
            "message": f"Ingested {stats['pages']} pages into {stats['chunks']} chunks.",
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """
    Stream the LLM response as Server-Sent Events.
    Each event: data: {"type": "token"|"sources"|"done"|"error", "data": ...}
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if collection_is_empty(req.session_id):
        raise HTTPException(
            status_code=400,
            detail="No document has been uploaded yet. Please upload a document first.",
        )

    return StreamingResponse(
        stream_chat(req.question, req.session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering if proxied
        },
    )


@app.post("/chat/reset")
def reset_history(req: ResetRequest):
    clear_history(req.session_id)
    return {"status": "ok", "message": "Conversation history cleared."}
