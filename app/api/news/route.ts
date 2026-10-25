import { NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

// The feed is aggregated on the server and cached for 5 minutes. Keeping the
// fetch out of the build means the site always shows live data instead of the
// snapshot that was baked in at build time.
export const revalidate = 300

export async function GET() {
  // getStore() -> fetchAllSources() pulls every RSS feed and the CISA KEV
  // catalog in parallel with Promise.all.
  const store = await getStore()
  return NextResponse.json(store, {
    // max-age=0 keeps browsers from replaying a stale payload; s-maxage=300
    // lets the edge absorb cold isolates for at most 5 minutes.
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=60' },
  })
}
