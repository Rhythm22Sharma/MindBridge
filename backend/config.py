"""
MindBridge Configuration Module.
Centralizes environment variables and tunable system parameters.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend directory or project root
load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Server settings
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# File ingestion settings
ALLOWED_EXTENSIONS = {".pdf", ".txt"}
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "50"))

# RAG & Chunking settings
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1024"))      # chars (~512 tokens)
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))  # chars (~64 tokens)
CHROMA_DIR = os.getenv("CHROMA_DIR", str(Path(__file__).resolve().parent / "chroma_store"))

# Embedding Model
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# LLM Model
LLM_MODEL_NAME = "llama-3.3-70b-versatile"
LLM_TEMPERATURE = 0.0
LLM_MAX_TOKENS = 1024
MAX_HISTORY_TURNS = 10
