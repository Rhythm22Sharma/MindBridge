'use client'

import { useState, useRef } from 'react'
import { uploadDocument } from '../app/api-client'

export type UploadState = 'idle' | 'uploading' | 'success' | 'error'

interface UploadZoneProps {
  onSuccess: (filename: string, pages: number, chunks: number) => void
  sessionId: string
}

export function UploadZone({ onSuccess, sessionId }: UploadZoneProps) {
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
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
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
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
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
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
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
