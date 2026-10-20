'use client'

import { useRef, useEffect } from 'react'
import { Message, MessageBubble } from './MessageBubble'
import { VoiceMicButton } from './VoiceMicButton'

interface ChatAreaProps {
  sessionId: string
  docLoaded: boolean
  docName: string
  backendError: string | null
  messages: Message[]
  input: string
  isStreaming: boolean
  onInputChange: (val: string) => void
  onSend: () => void
  onVoiceResult: (text: string) => void
}

const STARTER_PROMPTS = [
  'Summarise the main points',
  'What are the key concepts?',
  'Create 5 quiz questions',
]

export function ChatArea({
  sessionId,
  docLoaded,
  docName,
  backendError,
  messages,
  input,
  isStreaming,
  onInputChange,
  onSend,
  onVoiceResult,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const canSend = !!input.trim() && docLoaded && !isStreaming && !backendError && !!sessionId

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-stone-900">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              backendError ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span className="text-sm text-stone-400">
            {backendError
              ? 'Backend offline'
              : docLoaded
              ? `Loaded: ${docName}`
              : 'No document loaded'}
          </span>
        </div>
        <div className="text-xs text-stone-600 font-mono">
          {sessionId.slice(0, 16)}
          {sessionId ? '…' : ''}
        </div>
      </div>

      {/* Backend Offline Banner */}
      {backendError && (
        <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 flex items-start gap-3">
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <div className="font-medium">Backend offline</div>
            <div className="text-red-500 text-xs mt-0.5 font-mono">{backendError}</div>
          </div>
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && !backendError && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-stone-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
            </div>
            <div>
              <div className="text-stone-300 font-medium">
                {docLoaded ? 'Ask about your document' : 'Upload a document to begin'}
              </div>
              <div className="text-stone-600 text-sm mt-1">
                {docLoaded
                  ? "I'll answer strictly from what's in the document"
                  : 'Supports PDF and .txt files up to 50MB'}
              </div>
            </div>
            {docLoaded && (
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      onInputChange(prompt)
                      textareaRef.current?.focus()
                    }}
                    className="text-xs text-stone-400 border border-stone-700 hover:border-stone-500 hover:text-stone-300 rounded-full px-3 py-1.5 transition-all duration-150"
                  >
                    {prompt}
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

      {/* Input Composer */}
      <div className="px-6 py-4 border-t border-stone-800 flex-shrink-0">
        <div
          className={`flex gap-2 items-end bg-stone-800 border rounded-2xl px-4 py-3 transition-all duration-150 ${
            docLoaded && !backendError
              ? 'border-stone-700 focus-within:border-amber-500/40'
              : 'border-stone-800'
          }`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              onInputChange(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              backendError
                ? 'Backend offline…'
                : !docLoaded
                ? 'Upload a document first…'
                : isStreaming
                ? 'Generating response…'
                : 'Ask a question or press 🎤 to speak…'
            }
            disabled={!docLoaded || isStreaming || !!backendError}
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-stone-200 placeholder-stone-600 focus:outline-none disabled:opacity-40 leading-relaxed"
            style={{ maxHeight: '120px' }}
          />

          {/* Voice Input Mic */}
          <VoiceMicButton
            onResult={onVoiceResult}
            disabled={!docLoaded || !!backendError}
          />

          {/* Send Button */}
          <button
            onClick={onSend}
            disabled={!canSend}
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
              canSend
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-900'
                : 'bg-stone-700 text-stone-600 cursor-not-allowed'
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-stone-700 mt-2 text-center">
          Enter to send · Shift+Enter for newline · 🎤 speak to transcribe
        </p>
      </div>
    </main>
  )
}
