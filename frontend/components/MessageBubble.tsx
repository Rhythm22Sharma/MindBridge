'use client'

import { Source } from '../app/api-client'
import { Spinner } from './Spinner'
import { SourceBadges } from './SourceBadges'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources?: Source[]
  isStreaming?: boolean
  isOutOfScope?: boolean
}

interface MessageBubbleProps {
  msg: Message
}

export function MessageBubble({ msg }: MessageBubbleProps) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-amber-500 text-stone-900 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm font-medium leading-relaxed shadow-sm">
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
