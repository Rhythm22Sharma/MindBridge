const BASE = 'http://localhost:8000'

export interface UploadResult {
  filename: string
  pages: number
  chunks: number
  message: string
}

export interface Source {
  excerpt: number
  page: number | string
  source: string
}

export interface StreamEvent {
  type: 'token' | 'sources' | 'done' | 'error'
  data?: string | Source[]
}

export async function uploadDocument(file: File, sessionId: string): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload?session_id=${sessionId}`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export async function checkHealth(sessionId: string): Promise<{ status: string; document_loaded: boolean }> {
  const res = await fetch(`${BASE}/health?session_id=${sessionId}`)
  if (!res.ok) throw new Error('Backend unreachable')
  return res.json()
}

export async function resetHistory(sessionId: string): Promise<void> {
  await fetch(`${BASE}/chat/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })
}

/**
 * Opens an SSE stream to /chat/stream and calls onEvent for each parsed event.
 * Returns a cleanup function to abort the stream.
 */
export function streamChat(
  question: string,
  sessionId: string,
  onEvent: (event: StreamEvent) => void
): () => void {
  const controller = new AbortController()

  fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, session_id: sessionId }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Chat failed' }))
        onEvent({ type: 'error', data: err.detail || 'Chat request failed' })
        return
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: StreamEvent = JSON.parse(line.slice(6))
                onEvent(event)
              } catch {
                // malformed SSE line — skip
              }
            }
          }
        }
      } finally {
        // Guarantee streaming flag is cleared even if server closes
        // connection without sending a 'done' event
        onEvent({ type: 'done' })
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onEvent({ type: 'error', data: 'Connection to backend lost. Is the server running?' })
      }
    })

  return () => controller.abort()
}