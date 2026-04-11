"""
RAG chain: retrieve → format → stream from Groq (Llama 3.3 70B).

Why Groq over Gemini Flash for RAG:
- Groq inference is hardware-accelerated (LPU) — noticeably faster token streaming
- Llama 3.3 70B is instruction-tuned to follow strict system prompts reliably
- Gemini Flash occasionally drifts from strict "answer only from context" instructions;
  Llama 3.3 at temperature=0 is more disciplined for grounding tasks
- Groq free tier: 6000 req/day, 500k tokens/min — more than enough

Streaming: uses ChatGroq.astream() → SSE tokens arrive in real-time.
History: in-memory per session_id, capped at 10 turns to stay in context window.
"""

import os
import json
import logging
from typing import AsyncIterator, List
from collections import defaultdict

from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from langchain_core.messages import BaseMessage

from ingestor import get_retriever

logger = logging.getLogger(__name__)

_histories: dict[str, List[BaseMessage]] = defaultdict(list)
MAX_HISTORY_TURNS = 10

SYSTEM_PROMPT = """You are MindBridge, a precise study assistant. You answer questions ONLY using the document excerpts provided below.

Rules:
- If the answer is clearly present in the excerpts, answer it accurately and cite the source (e.g. "According to page 3...").
- If the answer is partially present, answer what you can and clearly state what is missing.
- If the answer is NOT in the excerpts at all, respond with exactly this phrase at the start: "NOT IN DOCUMENT —" followed by a brief explanation that the question is outside the uploaded document's scope. Do NOT guess or use outside knowledge.
- Never hallucinate facts. Never answer from general knowledge when the document doesn't support it.
- Be concise. Do not pad answers.

Document excerpts:
{context}
"""


def _get_llm() -> ChatGroq:
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.environ["GROQ_API_KEY"],
        temperature=0,        # 0 = maximum grounding discipline for RAG
        max_tokens=1024,
        streaming=True,
    )


def _format_docs(docs) -> tuple[str, list[dict]]:
    context_parts = []
    sources = []
    for i, doc in enumerate(docs):
        page = doc.metadata.get("page", "?")
        src = doc.metadata.get("source", "document")
        context_parts.append(f"[Excerpt {i+1} | {src} p.{page}]\n{doc.page_content}")
        sources.append({"excerpt": i + 1, "page": page, "source": src})
    return "\n\n---\n\n".join(context_parts), sources


def clear_history(session_id: str):
    _histories[session_id] = []


async def stream_chat(question: str, session_id: str) -> AsyncIterator[str]:
    """
    Retrieve → build prompt → stream Groq tokens as SSE events.
    Event types: sources | token | done | error
    """
    try:
        retriever = get_retriever(session_id=session_id)
        docs = retriever.invoke(question)

        if not docs:
            yield f"data: {json.dumps({'type': 'token', 'data': 'NOT IN DOCUMENT — No relevant content found in the uploaded document.'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        context, sources = _format_docs(docs)

        # Send sources before first token so UI can show them immediately
        yield f"data: {json.dumps({'type': 'sources', 'data': sources})}\n\n"

        system_msg = SystemMessage(content=SYSTEM_PROMPT.format(context=context))
        history = _histories[session_id][-(MAX_HISTORY_TURNS * 2):]
        user_msg = HumanMessage(content=question)
        messages = [system_msg] + history + [user_msg]

        llm = _get_llm()
        full_response = ""

        async for chunk in llm.astream(messages):
            token = chunk.content
            if token:
                full_response += token
                yield f"data: {json.dumps({'type': 'token', 'data': token})}\n\n"

        # Persist turn to history
        _histories[session_id].append(HumanMessage(content=question))
        _histories[session_id].append(AIMessage(content=full_response))

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except Exception as e:
        logger.exception("Error in stream_chat")
        yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
