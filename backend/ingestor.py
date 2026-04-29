"""
Document ingestion: load → chunk → embed (HuggingFace) → store in ChromaDB.

Embedding model: sentence-transformers/all-MiniLM-L6-v2
- Runs fully locally — no API key, no rate limits, no cost
- 384-dimensional output — fast HNSW index in ChromaDB
- Well-tested on retrieval tasks; good balance of speed vs quality
- First run downloads ~90MB model; cached to disk after that

Chunking: 512 tokens (~2048 chars) with 64-token (~256 char) overlap.
Why not 1000 (tutorial default): see DECISIONS.md §1.
"""

import os
import hashlib
import logging
from pathlib import Path
from typing import List
from functools import lru_cache

from langchain_community.document_loaders import PyPDFLoader
from langchain.schema import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

logger = logging.getLogger(__name__)

CHROMA_DIR = "./chroma_store"

CHUNK_SIZE = 1024    # chars ≈ 512 tokens (4 chars/token for English)
CHUNK_OVERLAP = 100  # chars ≈ 64 tokens


@lru_cache(maxsize=1)
def _get_embeddings() -> HuggingFaceEmbeddings:
    """
    Load once and cache. HuggingFaceEmbeddings downloads the model on
    first call (~90MB), then serves from disk cache.
    lru_cache(maxsize=1) ensures we never load it twice in one process.
    """
    logger.info("Loading HuggingFace embedding model (first call may take ~30s)...")
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


def _get_vectorstore(session_id: str = "default") -> Chroma:
    return Chroma(
        collection_name=f"mindbridge_{session_id}",
        embedding_function=_get_embeddings(),
        persist_directory=CHROMA_DIR,
    )


def ingest_document(file_path: str, filename: str, session_id: str = "default") -> dict:
    """
    Ingest a PDF or .txt into ChromaDB.
    Returns {chunks: int, pages: int}. Raises on failure.
    """
    path = Path(file_path)
    suffix = path.suffix.lower()

    # --- Load ---
    if suffix == ".pdf":
        loader = PyPDFLoader(file_path)
        docs: List[Document] = loader.load()
    elif suffix == ".txt":
        text = path.read_text(encoding="utf-8", errors="replace")
        docs = [Document(page_content=text, metadata={"source": filename, "page": 0})]
    else:
        raise ValueError(f"Unsupported file type: {suffix}")

    page_count = len(docs)
    logger.info("Loaded %d pages from %s", page_count, filename)

    for i, doc in enumerate(docs):
        doc.metadata["source"] = filename
        doc.metadata.setdefault("page", i)

    # --- Chunk ---
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(docs)
    logger.info("Split into %d chunks", len(chunks))

    if not chunks:
        raise ValueError(
            "Document produced no text. Is the PDF scanned/image-only?"
        )

    # Stable IDs — re-uploading the same file is idempotent
    ids = [
        hashlib.md5(c.page_content.encode()).hexdigest() + f"_{i}"
        for i, c in enumerate(chunks)
    ]

    # --- Clear old collection + Embed + Store ---
    vs = _get_vectorstore(session_id)
    try:
        existing = vs.get()
        if existing and existing.get("ids"):
            vs.delete(ids=existing["ids"])
    except Exception:
        pass
    vs.add_documents(documents=chunks, ids=ids)
    logger.info("Stored %d chunks in ChromaDB", len(chunks))

    return {"chunks": len(chunks), "pages": page_count}


def get_retriever(session_id: str = "default"):
    """
    Dynamic k — scales with collection size.
    Min 3, max 10, roughly 10% of total chunks.
    See DECISIONS.md §3 for reasoning.
    """
    vs = _get_vectorstore(session_id)
    total = vs._collection.count()
    k = max(3, min(10, total // 10 + 3))
    return vs.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k},
    )


def collection_is_empty(session_id: str = "default") -> bool:
    try:
        result = _get_vectorstore(session_id).get(limit=1)
        return len(result.get("ids", [])) == 0
    except Exception:
        return True