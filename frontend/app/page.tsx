'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { uploadDocument, streamChat, checkHealth, resetHistory, Source } from './api-client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources?: Source[]
  isStreaming?: boolean
  isOutOfScope?: boolean
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span className="inline-flex gap-1 items-center">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

// ── Source Badges ─────────────────────────────────────────────────────────────
function SourceBadges({ sources }: { sources: Source[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-700">
      {sources.map((s, i) => (
        <span
          key={i}
          className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2.5 py-0.5 font-mono"
        >
          p.{s.page}
        </span>
      ))}
    </div>
  )
}

// ── Upload Zone ───────────────────────────────────────────────────────────────
type UploadState = 'idle' | 'uploading' | 'success' | 'error'

function UploadZone({
  onSuccess,
  sessionId,
}: {
  onSuccess: (filename: string, pages: number, chunks: number) => void
  sessionId: string
}) {
  const [state, setState] = useState<UploadState>('idle')
  const [msg, setMsg] = useState('')
  const [dragging, setDragging] = useState(false)
  const [filename, setFilename] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'txt'].includes(ext ?? '')) {
      setState('error')
      setMsg('Only PDF and .txt files are supported.')
      return
    }
    setState('uploading')
    setMsg('')
    setFilename(file.name)
    try {
      const result = await uploadDocument(file, sessionId)
      setState('success')
      setMsg(`${result.pages} pages · ${result.chunks} chunks`)
      onSuccess(result.filename, result.pages, result.chunks)
    } catch (e: any) {
      setState('error')
      setMsg(e.message || 'Upload failed.')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (state === 'success') {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        className="group relative flex items-center gap-3 bg-stone-800/60 border border-stone-700 hover:border-amber-500/40 rounded-xl px-4 py-3 cursor-pointer transition-all duration-200"
      >
        <input ref={inputRef} type="file" accept=".pdf,.txt" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-stone-200 truncate">{filename}</div>
          <div className="text-xs text-stone-500">{msg}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs text-stone-500 group-hover:text-stone-400 transition-colors">Replace</span>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
        dragging
          ? 'border-amber-500/60 bg-amber-500/5'
          : state === 'error'
          ? 'border-red-500/40 bg-red-500/5'
          : 'border-stone-700 hover:border-stone-600 bg-stone-800/30 hover:bg-stone-800/50'
      }`}
    >
      <input ref={inputRef} type="file" accept=".pdf,.txt" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      {state === 'uploading' ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-stone-400">Processing document…</span>
        </div>
      ) : state === 'error' ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-sm font-medium text-red-400">Upload failed</div>
          <div className="text-xs text-stone-500">{msg}</div>
          <div className="text-xs text-stone-600 mt-1">Click to try again</div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-stone-700/50 border border-stone-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-stone-300">Drop your document here</div>
            <div className="text-xs text-stone-600 mt-1">PDF or .txt · max 50MB · or click to browse</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-amber-500 text-stone-900 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm font-medium leading-relaxed">
          {msg.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-stone-700 border border-stone-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div className={`max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed ${
        msg.isOutOfScope
          ? 'bg-stone-800/80 border border-amber-500/20 text-amber-300'
          : 'bg-stone-800 border border-stone-700 text-stone-200'
      }`}>
        {msg.isStreaming && msg.text === '' ? (
          <Spinner />
        ) : (
          <p className="whitespace-pre-wrap">{msg.text}</p>
        )}
        {msg.isStreaming && msg.text !== '' && (
          <span className="inline-block w-0.5 h-3.5 bg-amber-400 animate-pulse ml-0.5 align-middle" />
        )}
        {msg.sources && msg.sources.length > 0 && !msg.isOutOfScope && (
          <SourceBadges sources={msg.sources} />
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [docLoaded, setDocLoaded] = useState(false)
  const [docName, setDocName] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<(() => void) | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setSessionId('mindbridge-' + Math.random().toString(36).slice(2))
  }, [])

  useEffect(() => {
    if (!sessionId) return
    checkHealth(sessionId)
      .then((h) => {
        setBackendError(null)
        if (h.document_loaded) setDocLoaded(true)
      })
      .catch(() => setBackendError('Cannot reach backend. Run: uvicorn main:app --reload'))
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    const q = input.trim()
    if (!q || isStreaming || !sessionId) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: q }
    const assistantId = Date.now().toString() + '-a'
    const assistantMsg: Message = { id: assistantId, role: 'assistant', text: '', isStreaming: true }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)

    let fullText = ''
    abortRef.current = streamChat(q, sessionId, (event) => {
      if (event.type === 'sources') {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, sources: event.data as Source[] } : m)
        )
      } else if (event.type === 'token') {
        fullText += event.data as string
        const outOfScope = fullText.startsWith('NOT IN DOCUMENT')
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, text: fullText, isOutOfScope: outOfScope } : m)
        )
      } else if (event.type === 'done' || event.type === 'error') {
        if (event.type === 'error') {
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, text: `Error: ${event.data}` } : m)
          )
        }
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m)
        )
        setIsStreaming(false)
      }
    })
  }, [input, isStreaming, sessionId])

  const handleReset = async () => {
    await resetHistory(sessionId)
    setMessages([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = !!input.trim() && docLoaded && !isStreaming && !backendError && !!sessionId

  return (
    <div className="flex h-screen bg-stone-900 text-stone-100 overflow-hidden">

      {/* ── Sidebar ── */}
      <div className="w-64 flex-shrink-0 border-r border-stone-800 flex flex-col bg-stone-900">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-100 tracking-tight">MindBridge</div>
              <div className="text-xs text-stone-500">Study Assistant</div>
            </div>
          </div>
        </div>

        {/* Document section */}
        <div className="px-4 py-4 flex-1">
          <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">Document</div>
          <UploadZone
            onSuccess={(name, pages, chunks) => { setDocLoaded(true); setDocName(name) }}
            sessionId={sessionId}
          />

          {docLoaded && (
            <div className="mt-4 p-3 rounded-lg bg-stone-800/50 border border-stone-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-stone-400 font-medium">Ready to answer</span>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Ask anything about your document. I'll only answer from its content.
              </p>
            </div>
          )}
        </div>

        {/* ── Bottom actions ── */}
        <div className="px-4 py-4 border-t border-stone-800">
          {messages.length > 0 && (
            <button
              onClick={handleReset}
              className="w-full flex items-center gap-2.5 text-xs text-stone-500 hover:text-red-400 border border-stone-700/60 hover:border-red-500/30 hover:bg-red-500/[0.06] rounded-xl px-3 py-2.5 transition-all duration-150 group"
            >
              <svg
              style={{ width: '11px', height: '11px', flexShrink: 0 }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-stone-600 group-hover:text-red-400 transition-colors duration-150"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
              <span>Clear conversation</span>
              <span className="ml-auto text-[10px] bg-stone-800 group-hover:bg-red-500/10 group-hover:text-red-400 text-stone-600 px-2 py-0.5 rounded-full font-medium transition-all duration-150">
                {messages.filter((m) => m.role === 'user').length} msgs
              </span>
            </button>
          )}
        </div>

      </div>{/* ── End Sidebar ── */}

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${backendError ? 'bg-red-400' : 'bg-emerald-400'}`} />
            <span className="text-sm text-stone-400">
              {backendError ? 'Backend offline' : docLoaded ? `Loaded: ${docName}` : 'No document loaded'}
            </span>
          </div>
          <div className="text-xs text-stone-600 font-mono">
            {sessionId.slice(0, 16)}{sessionId ? '…' : ''}
          </div>
        </div>

        {/* Backend error */}
        {backendError && (
          <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 flex items-start gap-3">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="font-medium">Backend offline</div>
              <div className="text-red-500 text-xs mt-0.5 font-mono">{backendError}</div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && !backendError && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center">
                <svg className="w-7 h-7 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div>
                <div className="text-stone-300 font-medium">
                  {docLoaded ? 'Ask about your document' : 'Upload a document to begin'}
                </div>
                <div className="text-stone-600 text-sm mt-1">
                  {docLoaded
                    ? "I'll answer only from what's in the document"
                    : 'Supports PDF and .txt files up to 50MB'}
                </div>
              </div>
              {docLoaded && (
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {['Summarise the main points', 'What are the key concepts?', 'Create 5 quiz questions'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); textareaRef.current?.focus() }}
                      className="text-xs text-stone-400 border border-stone-700 hover:border-stone-500 hover:text-stone-300 rounded-full px-3 py-1.5 transition-all duration-150"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-stone-800 flex-shrink-0">
          <div className={`flex gap-3 items-end bg-stone-800 border rounded-2xl px-4 py-3 transition-all duration-150 ${
            docLoaded && !backendError ? 'border-stone-700 focus-within:border-amber-500/40' : 'border-stone-800'
          }`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                backendError ? 'Backend offline…' :
                !docLoaded ? 'Upload a document first…' :
                isStreaming ? 'Generating response…' :
                'Ask a question about your document…'
              }
              disabled={!docLoaded || isStreaming || !!backendError}
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-stone-200 placeholder-stone-600 focus:outline-none disabled:opacity-40 leading-relaxed"
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                canSend
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-900'
                  : 'bg-stone-700 text-stone-600 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-stone-700 mt-2 text-center">Enter to send · Shift+Enter for newline</p>
        </div>

      </div>{/* ── End Main chat area ── */}

    </div>
  )
}
