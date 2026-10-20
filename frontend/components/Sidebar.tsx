'use client'

import { UploadZone } from './UploadZone'
import { Message } from './MessageBubble'

interface SidebarProps {
  sessionId: string
  docLoaded: boolean
  onUploadSuccess: (filename: string, pages: number, chunks: number) => void
  messages: Message[]
  onReset: () => void
}

export function Sidebar({
  sessionId,
  docLoaded,
  onUploadSuccess,
  messages,
  onReset,
}: SidebarProps) {
  const userMessageCount = messages.filter((m) => m.role === 'user').length

  return (
    <aside className="w-64 flex-shrink-0 border-r border-stone-800 flex flex-col bg-stone-900">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
            <svg
              className="w-4 h-4 text-stone-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-stone-100 tracking-tight">MindBridge</div>
            <div className="text-xs text-stone-500">Study Assistant</div>
          </div>
        </div>
      </div>

      {/* Document Ingestion Section */}
      <div className="px-4 py-4 flex-1 overflow-y-auto">
        <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Document
        </div>
        <UploadZone onSuccess={onUploadSuccess} sessionId={sessionId} />

        {docLoaded && (
          <div className="mt-4 p-3 rounded-lg bg-stone-800/50 border border-stone-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-stone-400 font-medium">Ready to answer</span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              Ask anything about your document. I will only answer strictly from its content.
            </p>
          </div>
        )}
      </div>

      {/* Footer / Reset Action */}
      <div className="px-4 py-4 border-t border-stone-800">
        {messages.length > 0 && (
          <button
            onClick={onReset}
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
              {userMessageCount} msgs
            </span>
          </button>
        )}
      </div>
    </aside>
  )
}
