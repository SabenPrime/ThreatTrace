import { NextResponse } from 'next/server'
import { refresh } from '@/lib/store'
import { isGroqConfigured } from '@/lib/summarizer'

export const dynamic = 'force-dynamic'

async function handle() {
  try {
    const store = await refresh(true)
    return NextResponse.json({
      ok: true,
      updatedAt: store.updatedAt,
      count: store.blinks.length,
      aiSummarized: store.blinks.filter((b) => b.aiSummarized).length,
      groq: isGroqConfigured(),
      storage: 'memory',
    })
  } catch (error) {
    console.error('[threattrace] /api/refresh failed:', (error as Error).message)
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
