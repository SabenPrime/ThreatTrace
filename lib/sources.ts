import { XMLParser } from 'fast-xml-parser'
import type { RawItem } from './types'

const USER_AGENT = 'Mozilla/5.0 (compatible; ThreatTraceBot/1.0; +https://threattrace.app)'
const FETCH_TIMEOUT = 12_000

interface RssSource {
  id: string
  name: string
  urls: string[]
}

export const RSS_SOURCES: RssSource[] = [
  {
    id: 'thehackernews',
    name: 'The Hacker News',
    urls: ['https://feeds.feedburner.com/TheHackersNews', 'https://thehackernews.com/feeds/posts/default'],
  },
  { id: 'bleepingcomputer', name: 'BleepingComputer', urls: ['https://www.bleepingcomputer.com/feed/'] },
  { id: 'securityweek', name: 'SecurityWeek', urls: ['https://www.securityweek.com/feed/'] },
  { id: 'threatpost', name: 'ThreatPost', urls: ['https://threatpost.com/feed/'] },
  { id: 'darkreading', name: 'DarkReading', urls: ['https://www.darkreading.com/rss.xml'] },
  { id: 'krebs', name: 'KrebsOnSecurity', urls: ['https://krebsonsecurity.com/feed/'] },
  { id: 'therecord', name: 'The Record', urls: ['https://therecord.media/feed'] },
  { id: 'securityaffairs', name: 'SecurityAffairs', urls: ['https://securityaffairs.com/feed'] },
  { id: 'gbhackers', name: 'GBHackers', urls: ['https://gbhackers.com/feed/'] },
  { id: 'cybersecuritynews', name: 'CybersecurityNews', urls: ['https://cybersecuritynews.com/feed/'] },
  { id: 'hackread', name: 'HackRead', urls: ['https://www.hackread.com/feed/'] },
  {
    id: 'infosecurity',
    name: 'Infosecurity Magazine',
    urls: ['https://www.infosecurity-magazine.com/rss/news/'],
  },
  { id: 'theregister', name: 'The Register', urls: ['https://www.theregister.com/security/headlines.atom'] },
  { id: 'microsoft', name: 'Microsoft Security', urls: ['https://www.microsoft.com/en-us/security/blog/feed/'] },
  {
    id: 'google-tag',
    name: 'Google TAG',
    urls: [
      'https://blog.google/threat-analysis-group/rss/',
      'https://feeds.feedburner.com/threatintelligence/pvexyqv7v0v',
    ],
  },
]

const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'

export const SOURCE_NAMES = [...RSS_SOURCES.map((s) => s.name), 'CISA KEV']

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true,
  htmlEntities: true,
})

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
}

export function cleanText(input: unknown): string {
  const raw = toText(input)
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITY_MAP[name.toLowerCase()] ?? m)
    .replace(/The post .+? appeared first on .+?\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return toText(value[0])
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return toText(obj['#text'] ?? obj['@_href'] ?? '')
  }
  return ''
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml, application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`${url} responded ${res.status}`)
  return res.text()
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim())
    u.hash = ''
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('utm_')) u.searchParams.delete(key)
    }
    return u.toString().replace(/\/$/, '')
  } catch {
    return url.trim()
  }
}

function parseFeed(xml: string, source: RssSource): RawItem[] {
  const doc = parser.parse(xml)
  const rssItems = doc?.rss?.channel?.item
  const atomEntries = doc?.feed?.entry
  const entries: Record<string, unknown>[] = [rssItems ?? atomEntries ?? []].flat()

  return entries
    .map((entry): RawItem | null => {
      const title = cleanText(entry.title)
      let link = toText(entry.link)
      if (!link && Array.isArray(entry.link)) {
        const alt = (entry.link as Record<string, string>[]).find((l) => l['@_rel'] !== 'self')
        link = alt?.['@_href'] ?? ''
      }
      const date = toText(entry.pubDate ?? entry.published ?? entry.updated ?? entry['dc:date'])
      const description = cleanText(entry.description ?? entry.summary ?? entry['content:encoded'] ?? entry.content)
      if (!title || !link) return null
      const published = date ? new Date(date) : new Date()
      return {
        title,
        url: normalizeUrl(link),
        source: source.name,
        sourceId: source.id,
        publishedAt: Number.isNaN(published.getTime()) ? new Date().toISOString() : published.toISOString(),
        description: description.slice(0, 1200),
      }
    })
    .filter((x): x is RawItem => x !== null)
}

async function fetchRss(source: RssSource): Promise<RawItem[]> {
  for (const url of source.urls) {
    try {
      const xml = await fetchText(url)
      const items = parseFeed(xml, source)
      if (items.length > 0) return items
    } catch (error) {
      console.log(`[threattrace] feed ${source.id} failed at ${url}:`, (error as Error).message)
    }
  }
  return []
}

interface KevEntry {
  cveID: string
  vendorProject: string
  product: string
  vulnerabilityName: string
  dateAdded: string
  shortDescription: string
  requiredAction: string
  dueDate: string
  knownRansomwareCampaignUse: string
}

async function fetchKev(): Promise<RawItem[]> {
  try {
    const json = JSON.parse(await fetchText(KEV_URL)) as { vulnerabilities: KevEntry[] }
    return json.vulnerabilities
      .slice()
      .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
      .slice(0, 40)
      .map((v) => ({
        title: `${v.vulnerabilityName} (${v.cveID})`,
        url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
        source: 'CISA KEV',
        sourceId: 'cisa-kev',
        publishedAt: new Date(`${v.dateAdded}T12:00:00Z`).toISOString(),
        description: `${v.shortDescription} CISA added it to the Known Exploited Vulnerabilities catalog, confirming active exploitation.`,
        extraTags: [v.vendorProject, v.product].filter((t, i, arr) => t && arr.indexOf(t) === i).slice(0, 2),
        cves: [v.cveID],
        kev: {
          vendor: v.vendorProject,
          product: v.product,
          requiredAction: v.requiredAction,
          dueDate: v.dueDate,
          ransomware: v.knownRansomwareCampaignUse === 'Known',
        },
      }))
  } catch (error) {
    console.log('[threattrace] CISA KEV failed:', (error as Error).message)
    return []
  }
}

export async function fetchAllSources(): Promise<RawItem[]> {
  const results = await Promise.all([...RSS_SOURCES.map(fetchRss), fetchKev()])
  const seen = new Set<string>()
  const deduped: RawItem[] = []
  for (const item of results.flat()) {
    const key = item.url.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }
  return deduped
}
