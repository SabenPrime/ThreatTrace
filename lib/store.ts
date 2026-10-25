import { after } from 'next/server'
import { categorize, extractCves, extractTags, scoreSeverity, SEVERITY_RANK } from './classify'
import seed from './data.json'
import { fetchAllSources } from './sources'
import { fallbackSummary } from './summarizer'
import type { Blink, BlinkStore, RawItem } from './types'

export const REFRESH_INTERVAL_MS = 5 * 60_000
const MIN_REFRESH_GAP_MS = 60_000
const WINDOW_MS = 72 * 3_600_000
const EXTENDED_WINDOW_MS = 7 * 24 * 3_600_000
const MAX_BLINKS = 30

// The refresh only aggregates the feeds. It never calls Groq: the free tier
// allows 200000 tokens per day and a single call costs roughly 750, so feeding
// the model on every pass would exhaust the budget and starve the on-demand
// briefs in /api/brief/:id. The detail-page sections are built from the source
// description instead.

// In-memory cache (Map): no external storage dependency, so reads are served
// from memory instantly and the same code runs on Node, Vercel and Cloudflare.
const cache = new Map<string, BlinkStore>()
const CACHE_KEY = 'blinks'

let inflight: Promise<BlinkStore> | null = null

function isValid(store: unknown): store is BlinkStore {
  return Boolean(store && typeof store === 'object' && Array.isArray((store as BlinkStore).blinks))
}

function readCache(): BlinkStore | null {
  const store = cache.get(CACHE_KEY)
  return isValid(store) && store.blinks.length > 0 ? store : null
}

function seedStore(): BlinkStore {
  return isValid(seed) ? (seed as BlinkStore) : { updatedAt: null, blinks: [] }
}

function load(): BlinkStore {
  return readCache() ?? seedStore()
}

function persist(store: BlinkStore) {
  cache.set(CACHE_KEY, store)
}

// Deterministic, dependency-free id (cyrb53). Stable across refreshes so cached
// summaries can be reused, and it avoids node:crypto so the module also runs on
// edge runtimes (Cloudflare Workers).
function blinkId(url: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < url.length; i++) {
    const ch = url.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16)).padStart(12, '0').slice(0, 12)
}

function selectRecent(items: RawItem[]): RawItem[] {
  const now = Date.now()
  const inWindow = (ms: number) => items.filter((i) => now - Date.parse(i.publishedAt) <= ms)
  const recent = inWindow(WINDOW_MS)
  return recent.length >= 12 ? recent : inWindow(EXTENDED_WINDOW_MS)
}

async function runRefresh(): Promise<BlinkStore> {
  const previous = load()

  // fetchAllSources() fans out to every RSS feed with Promise.all, so the slowest
  // source never blocks the others.
  const raw = selectRecent(await fetchAllSources())
  const scored = raw
    .map((item) => {
      const cves = item.cves ?? extractCves(`${item.title} ${item.description}`)
      const enriched: RawItem = { ...item, cves }
      return {
        item: enriched,
        severity: scoreSeverity(enriched),
        categories: categorize(enriched),
        tags: extractTags(enriched),
      }
    })
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        Date.parse(b.item.publishedAt) - Date.parse(a.item.publishedAt),
    )
    .slice(0, MAX_BLINKS)

  if (scored.length === 0) {
    console.error('[threattrace] all sources returned no items; keeping previous data')
    return previous
  }

  const blinks: Blink[] = scored.map((s) => ({
    id: blinkId(s.item.url),
    title: s.item.title,
    url: s.item.url,
    source: s.item.source,
    sourceId: s.item.sourceId,
    publishedAt: s.item.publishedAt,
    severity: s.severity,
    categories: s.categories,
    tags: s.tags,
    cves: s.item.cves ?? [],
    description: s.item.description,
    summary: fallbackSummary(s.item, s.categories, s.tags),
    // No model runs during a refresh; see the note at the top of the file.
    aiSummarized: false,
  }))

  const store: BlinkStore = { updatedAt: new Date().toISOString(), blinks }
  persist(store)
  return store
}

function isStale(store: BlinkStore | null, maxAge: number): boolean {
  if (!store?.updatedAt) return true
  return Date.now() - Date.parse(store.updatedAt) > maxAge
}

export async function refresh(force = false): Promise<BlinkStore> {
  if (inflight) return inflight
  const current = load()
  if (!force && !isStale(current, MIN_REFRESH_GAP_MS)) return current

  inflight = runRefresh().finally(() => {
    inflight = null
  })
  return inflight
}

function scheduleBackgroundRefresh() {
  if (inflight) return
  const task = () =>
    refresh(true).catch((error) => console.error('[threattrace] background refresh failed:', (error as Error).message))
  try {
    after(task)
  } catch {
    void task()
  }
}

export async function getStore(): Promise<BlinkStore> {
  const cached = readCache()
  if (!cached) return refresh(true)

  // Warm cache: serve immediately and refresh in the background once the feed is
  // older than the 5 minute cadence the cron also drives.
  if (isStale(cached, REFRESH_INTERVAL_MS)) scheduleBackgroundRefresh()
  return cached
}

export async function getBlink(id: string): Promise<Blink | null> {
  const store = await getStore()
  return store.blinks.find((b) => b.id === id) ?? null
}
