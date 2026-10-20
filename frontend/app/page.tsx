'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { streamChat, checkHealth, resetHistory, Source } from './api-client'
import { Sidebar } from '../components/Sidebar'
import { ChatArea } from '../components/ChatArea'
import { Message } from '../components/MessageBubble'

export default function Home() {
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [docLoaded, setDocLoaded] = useState(false)
  const [docName, setDocName] = useState('')
  const abortRef = useRef<(() => void) | null>(null)

  // Initialize random session identifier
  useEffect(() => {
    setSessionId('mindbridge-' + Math.random().toString(36).slice(2))
  }, [])

  // Health check polling on session creation
  useEffect(() => {
    if (!sessionId) return
    checkHealth(sessionId)
      .then((h) => {
        setBackendError(null)
        if (h.document_loaded) setDocLoaded(true)
      })
      .catch(() => setBackendError('Cannot reach backend. Run: uvicorn main:app --reload'))
  }, [sessionId])

  // Handle voice speech-to-text transcription result
  const handleVoiceResult = useCallback((text: string) => {
    setInput(text)
  }, [])

  // Submit query to streaming RAG endpoint
  const handleSend = useCallback(() => {
    const q = input.trim()
    if (!q || isStreaming || !sessionId) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: q }
    const assistantId = Date.now().toString() + '-a'
    const assistantMsg: Message = { id: assistantId, role: 'assistant', text: '', isStreaming: true }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)

    let fullText = ''
    abortRef.current = streamChat(q, sessionId, (event) => {
      if (event.type === 'sources') {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, sources: event.data as Source[] } : m))
        )
      } else if (event.type === 'token') {
        fullText += event.data as string
        const outOfScope = fullText.startsWith('NOT IN DOCUMENT')
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, text: fullText, isOutOfScope: outOfScope } : m
          )
        )
      } else if (event.type === 'done' || event.type === 'error') {
        if (event.type === 'error') {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, text: `Error: ${event.data}` } : m))
          )
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
        )
        setIsStreaming(false)
      }
    })
  }, [input, isStreaming, sessionId])

  // Clear conversation history on backend and UI
  const handleReset = async () => {
    if (abortRef.current) abortRef.current()
    await resetHistory(sessionId)
    setMessages([])
  }

  const handleUploadSuccess = (name: string) => {
    setDocLoaded(true)
    setDocName(name)
  }

  return (
    <div className="flex h-screen bg-stone-900 text-stone-100 overflow-hidden font-sans">
      <Sidebar
        sessionId={sessionId}
        docLoaded={docLoaded}
        onUploadSuccess={handleUploadSuccess}
        messages={messages}
        onReset={handleReset}
      />
      <ChatArea
        sessionId={sessionId}
        docLoaded={docLoaded}
        docName={docName}
        backendError={backendError}
        messages={messages}
        input={input}
        isStreaming={isStreaming}
        onInputChange={setInput}
        onSend={handleSend}
        onVoiceResult={handleVoiceResult}
      />
    </div>
  )
}
