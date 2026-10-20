'use client'

import { useState, useRef } from 'react'
import { transcribeAudio } from '../app/api-client'

interface VoiceMicButtonProps {
  onResult: (text: string) => void
  disabled: boolean
}

export function VoiceMicButton({ onResult, disabled }: VoiceMicButtonProps) {
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const start = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setLoading(true)
        try {
          const transcribedText = await transcribeAudio(blob)
          if (transcribedText) {
            onResult(transcribedText)
          }
        } catch (e: any) {
          setError(e.message || 'Transcription failed')
        } finally {
          setLoading(false)
        }
      }

      recorder.start()
      setRecording(true)
    } catch (e: any) {
      setError(e.name === 'NotAllowedError' ? 'Mic access denied' : 'Mic error')
    }
  }

  const stop = () => {
    recorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className="relative">
      <button
        onClick={recording ? stop : start}
        disabled={disabled || loading}
        title={recording ? 'Stop recording' : 'Voice input'}
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
          recording
            ? 'bg-red-500 text-white animate-pulse'
            : loading
            ? 'bg-stone-700 text-stone-500 cursor-wait'
            : disabled
            ? 'bg-stone-800 text-stone-700 cursor-not-allowed'
            : 'bg-stone-700 hover:bg-stone-600 text-stone-300'
        }`}
      >
        {loading ? (
          <div className="w-3 h-3 border border-stone-400 border-t-transparent rounded-full animate-spin" />
        ) : recording ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </button>
      {error && (
        <div className="absolute bottom-10 right-0 w-44 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-xs text-red-400 z-10 shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}
