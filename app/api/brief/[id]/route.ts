import { NextResponse } from 'next/server'
import { readBrief, writeBrief } from '@/lib/ai-briefs'
import { getBlink } from '@/lib/store'
import { GroqRateLimitError, isGroqConfigured, requestBrief } from '@/lib/summarizer'
import type { AiBrief } from '@/lib/types'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

// Single-flight lock: two visitors opening the same blink at the same time share
// one Groq call. The map lives per isolate, so a burst that lands on several
// isolates can still cost a few calls, but KV makes every later visit free.
const generating = new Map<string, Promise<AiBrief | null>>()

function generate(id: string): Promise<AiBrief | null> {
  const inflight = generating.get(id)
  if (inflight) return inflight

  const task = (async () => {
    const blink = await getBlink(id)
    return blink ? requestBrief(blink) : null
  })().finally(() => generating.delete(id))

  generating.set(id, task)
  return task
}

// Cached read: never spends a model call.
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const brief = await readBrief(id)
  if (!brief) return NextResponse.json({ error: 'no brief cached' }, { status: 404 })
  return NextResponse.json({ brief, cached: true })
}

// Generate on demand, or serve the cached brief when the blink has been read
// before.
export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params

  const cached = await readBrief(id)
  if (cached) return NextResponse.json({ brief: cached, cached: true })

  if (!isGroqConfigured()) {
    return NextResponse.json({ error: 'AI briefs are unavailable' }, { status: 503 })
  }

  try {
    const brief = await generate(id)
    if (!brief) return NextResponse.json({ error: 'brief unavailable' }, { status: 502 })
    await writeBrief(id, brief)
    return NextResponse.json({ brief, cached: false })
  } catch (error) {
    // Groq's free tier is rate limited; telling the client to try again is more
    // useful than a generic failure.
    if (error instanceof GroqRateLimitError) {
      return NextResponse.json({ error: 'queue busy' }, { status: 429 })
    }
    console.error(`[threattrace] brief for ${id} failed:`, (error as Error).message)
    return NextResponse.json({ error: 'brief unavailable' }, { status: 502 })
  }
}
