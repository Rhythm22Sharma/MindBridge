'use client'

import { Source } from '../app/api-client'

interface SourceBadgesProps {
  sources: Source[]
}

export function SourceBadges({ sources }: SourceBadgesProps) {
  if (!sources || sources.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-700">
      {sources.map((s, i) => (
        <span
          key={i}
          className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2.5 py-0.5 font-mono"
          title={`Source: ${s.source} (Page ${s.page})`}
        >
          p.{s.page}
        </span>
      ))}
    </div>
  )
}
