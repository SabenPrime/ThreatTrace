'use client'

import { useEffect, useState } from 'react'
import { useBlinks } from '@/hooks/use-blinks'
import { timeAgo } from '@/lib/format'

export function LiveIndicator() {
  const { data } = useBlinks()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const updated = now && data?.updatedAt ? timeAgo(data.updatedAt, now) : '—'

  return (
    <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground" aria-live="polite">
      <span className="flex items-center gap-2 text-white">
        <span className="relative flex size-2" aria-hidden="true">
          <span className="absolute inline-flex size-full rounded-full bg-signal animate-live-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-signal shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
        </span>
        LIVE
      </span>
      <span className="h-3 w-px bg-white/10" aria-hidden="true" />
      <span>Updated {updated}</span>
    </div>
  )
}
