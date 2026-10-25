'use client'

import { Component, useCallback, useEffect, useState, type ReactNode } from 'react'
import { AiBriefCard } from './ai-brief-card'
import type { AiBrief } from '@/lib/types'

type BriefState = 'idle' | 'loading' | 'loaded' | 'error'

// Groq's free tier answers 429 when the per-minute token budget is spent, which
// usually clears within a couple of seconds.
const RETRY_DELAY_MS = 2000

function storageKey(id: string): string {
  return `brief-${id}`
}

function readStored(id: string): AiBrief | null {
  try {
    const raw = window.localStorage.getItem(storageKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as AiBrief | null
    return parsed?.tldr ? parsed : null
  } catch {
    // Corrupt entry or storage blocked in private mode: fall through to the API.
    return null
  }
}

function persist(id: string, brief: AiBrief) {
  try {
    window.localStorage.setItem(storageKey(id), JSON.stringify(brief))
  } catch {
    // Storage full or unavailable; the KV copy still makes the next visit fast.
  }
}

async function fetchBrief(id: string): Promise<AiBrief> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`/api/brief/${encodeURIComponent(id)}`, { method: 'POST' })
    if (res.status === 429 && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      continue
    }
    if (!res.ok) throw new Error(`brief request failed with ${res.status}`)
    const data = (await res.json()) as { brief?: AiBrief }
    if (!data.brief?.tldr) throw new Error('brief response carried no content')
    return data.brief
  }
  throw new Error('brief request failed')
}

// If the card throws while rendering, fall back to nothing: the page below still
// shows the standard THE BLINK sections.
class BriefBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.error('[threattrace] AI brief card crashed:', error.message)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function BriefMe({ id }: { id: string }) {
  const [state, setState] = useState<BriefState>('idle')
  const [brief, setBrief] = useState<AiBrief | null>(null)

  // Runs after hydration so the server and the first client render agree, then
  // swaps in the stored brief so a repeat visit is instant.
  useEffect(() => {
    const cached = readStored(id)
    setBrief(cached)
    setState(cached ? 'loaded' : 'idle')
  }, [id])

  const request = useCallback(async () => {
    setState('loading')
    try {
      const next = await fetchBrief(id)
      persist(id, next)
      setBrief(next)
      setState('loaded')
    } catch (error) {
      console.error('[threattrace] AI brief request failed:', (error as Error).message)
      setState('error')
    }
  }, [id])

  const ready = state === 'loaded' && Boolean(brief?.tldr)

  return (
    <div className="mt-6 flex flex-col gap-4">
      {!ready && (
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={request}
            disabled={state === 'loading'}
            className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6] bg-black px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#3b82f6] transition-colors hover:bg-[#3b82f6]/10 disabled:cursor-default disabled:opacity-60"
          >
            {state === 'loading' ? '✦ Briefing…' : state === 'error' ? '✦ Brief Me Again' : '✦ Brief Me'}
          </button>
          {state === 'error' && (
            <p className="font-mono text-[11px] leading-relaxed text-white/40">
              The analyst is busy. Try again in a moment.
            </p>
          )}
        </div>
      )}

      {ready && (
        <BriefBoundary>
          <AiBriefCard brief={brief} />
        </BriefBoundary>
      )}
    </div>
  )
}
