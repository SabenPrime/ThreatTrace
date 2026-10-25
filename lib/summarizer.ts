import type { AiBrief, Blink, BlinkSummary, Category, RawItem } from './types'

const SUMMARY_PROMPT =
  'You are a SOC analyst writing entries for a cybersecurity news feed. Reply with a single JSON object and nothing else. ' +
  'Keys: "what" is what happened, one short line; "impact" is who is affected, one short line; "action" is what a defender should do, one short line. ' +
  'Mention any CVE identifier. The three lines together must stay under 50 words. Be specific, never generic. No markdown, no code fences.'

const BRIEF_PROMPT =
  'You are a SOC analyst summarizing like Snipd podcast app. Give insights NOT in the title. ' +
  'Keep short, actionable, no fluff. Return valid JSON only. ' +
  'Keys: "tldr" is a one line plain-English summary; "keyPoints" is an array of at most 3 short bullets; ' +
  '"whosAtRisk" is who is affected; "action" is what to do now (patch, hunt or mitigate); ' +
  '"exploitStatus" is exactly one of "Active exploitation", "PoC public", "KEV added" or "No PoC".'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const PRIMARY_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
// Groq retires models over time; when the primary is unavailable to the key,
// fall back to the closest fast model so summaries keep flowing.
const FALLBACK_MODELS = ['openai/gpt-oss-120b', 'llama-3.1-8b-instant']
const TIMEOUT_MS = 12_000
const MAX_ATTEMPTS = 3
const MAX_SUMMARY_TOKENS = 180
const MAX_BRIEF_TOKENS = 500

let missingKeyLogged = false
let activeModelIndex = 0
const modelChain = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)]

class ModelUnavailableError extends Error {}

// Thrown when Groq replies 429. The brief endpoint turns this into a `queue
// busy` response so the client can try again shortly instead of giving up.
export class GroqRateLimitError extends Error {}

function requestBody(model: string, system: string, prompt: string, maxTokens: number) {
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: prompt },
  ]
  const response_format = { type: 'json_object' }
  if (model.startsWith('openai/gpt-oss')) {
    return {
      model,
      messages,
      temperature: 0.2,
      max_tokens: maxTokens,
      reasoning_effort: 'low',
      include_reasoning: false,
      response_format,
    }
  }
  return { model, messages, temperature: 0.2, max_tokens: maxTokens, response_format }
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY)
}

// Both `RawItem` (fresh from the feeds) and `Blink` (read back from the store)
// carry these fields, so the prompt can be built from either.
type PromptItem = Pick<RawItem, 'title' | 'source' | 'description'> & {
  cves?: string[]
  kev?: RawItem['kev']
}

function buildPrompt(item: PromptItem): string {
  const cves = item.cves?.length ? `\nCVEs: ${item.cves.join(', ')}` : ''
  const kev = item.kev
    ? `\nCISA KEV: ${item.kev.vendor} ${item.kev.product}. Required action: ${item.kev.requiredAction} Due ${item.kev.dueDate}.`
    : ''
  // Only the opening of the description is sent: it carries the facts the model
  // needs while keeping each request small enough to stay inside Groq's free
  // per-minute token budget.
  return `Title: ${item.title}\nSource: ${item.source}${cves}${kev}\n\n${item.description.slice(0, 400)}`
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function callGroq(system: string, prompt: string, maxTokens: number): Promise<string> {
  while (activeModelIndex < modelChain.length) {
    const model = modelChain[activeModelIndex]
    try {
      return await callGroqModel(model, system, prompt, maxTokens)
    } catch (error) {
      if (!(error instanceof ModelUnavailableError)) throw error
      const next = modelChain[activeModelIndex + 1]
      console.error(`[threattrace] Groq model "${model}" unavailable${next ? `; switching to "${next}"` : ''}.`)
      if (modelChain[activeModelIndex] === model) activeModelIndex++
    }
  }
  throw new Error('No Groq model in the fallback chain is available for this API key')
}

async function callGroqModel(model: string, system: string, prompt: string, maxTokens: number): Promise<string> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY is not set')

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody(model, system, prompt, maxTokens)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (res.status === 404 || res.status === 400) {
      const body = await res.text().catch(() => '')
      if (/model_not_found|model_decommissioned|does not exist/i.test(body)) throw new ModelUnavailableError(body)
      throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`)
    }

    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const content = data.choices?.[0]?.message?.content?.trim()
      if (!content) throw new Error('Groq returned an empty completion')
      return content
    }

    // A 429 means the key's per-minute token budget is exhausted. Retrying just
    // burns another subrequest and still fails, so hand the rate limit to the
    // caller: a refresh falls back to the description-based summary, and the
    // brief endpoint tells the client to come back in a moment.
    if (res.status === 429) {
      const body = await res.text().catch(() => '')
      throw new GroqRateLimitError(`Groq 429: ${body.slice(0, 200)}`)
    }

    const retryable = res.status >= 500
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      const body = await res.text().catch(() => '')
      throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`)
    }
    const retryAfter = Number(res.headers.get('retry-after'))
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : 1500 * attempt)
  }
}

function asLine(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const line = value
    .replace(/\*\*/g, '')
    .replace(/^["'`\s]+|["'`\s]+$/g, '')
    .trim()
  return line.length > 3 ? line : null
}

// Models occasionally wrap JSON in prose or code fences, so pull out the first
// object instead of assuming the whole response is parseable.
function parseJson(text: string): Record<string, unknown> | null {
  const raw = text.match(/\{[\s\S]*\}/)?.[0]
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as unknown
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function parseSummary(text: string): BlinkSummary | null {
  const data = parseJson(text)
  if (!data) return null
  const what = asLine(data.what)
  const impact = asLine(data.impact)
  const action = asLine(data.action)
  if (!what || !impact || !action) return null
  return { what, impact, action }
}

function parseBrief(text: string): AiBrief | null {
  const data = parseJson(text)
  if (!data) return null
  const tldr = asLine(data.tldr)
  const whosAtRisk = asLine(data.whosAtRisk)
  const action = asLine(data.action)
  const exploitStatus = asLine(data.exploitStatus)
  if (!tldr || !whosAtRisk || !action || !exploitStatus) return null
  const keyPoints = Array.isArray(data.keyPoints)
    ? data.keyPoints
        .map((point) => asLine(point))
        .filter((point): point is string => Boolean(point))
        .slice(0, 3)
    : []
  return { tldr, keyPoints, whosAtRisk, action, exploitStatus }
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s*\[(?:…|\.\.\.)\]\s*$/, '')
    .split(/(?<=[a-z0-9)"”’][.!?])\s+(?=[A-Z"“‘(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
}

function clip(text: string, max = 170): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

function fallbackAction(categories: Category[], item: RawItem, tags: string[]): string {
  const cve = item.cves?.[0]
  const target = tags[0] ?? 'affected systems'
  if (item.kev) return clip(`Patch ${item.kev.product}${cve ? ` (${cve})` : ''} before CISA's ${item.kev.dueDate} deadline.`)
  if (categories.includes('zero-day')) return `Apply the emergency ${target} patch${cve ? ` for ${cve}` : ''} and hunt for compromise.`
  if (categories.includes('ransomware')) return `Patch exposed ${target} services, verify offline backups and enforce MFA.`
  if (categories.includes('breach')) return 'Reset exposed credentials, enable MFA and expect targeted phishing.'
  if (categories.includes('patches')) return `Roll out the latest ${target} updates${cve ? ` covering ${cve}` : ''}.`
  return `Check whether you run ${target} and follow the vendor advisory.`
}

export function fallbackSummary(item: RawItem, categories: Category[], tags: string[]): BlinkSummary {
  const sentences = splitSentences(item.description)
  const what = clip(sentences[0] ?? item.title)
  let impact: string
  if (item.kev) {
    impact = `Organizations running ${item.kev.vendor} ${item.kev.product}; exploitation confirmed in the wild.`
  } else if (sentences[1]) {
    impact = clip(sentences[1])
  } else if (tags.length) {
    impact = `Users and organizations relying on ${tags.slice(0, 2).join(' and ')}.`
  } else {
    impact = 'Organizations and users exposed to this threat.'
  }
  return { what, impact, action: fallbackAction(categories, item, tags) }
}

export interface SummaryOutcome {
  summary: BlinkSummary
  // False when the description-based fallback was used instead of the model.
  ai: boolean
}

export async function summarize(item: RawItem, categories: Category[], tags: string[]): Promise<SummaryOutcome> {
  const fallback = (): SummaryOutcome => ({ summary: fallbackSummary(item, categories, tags), ai: false })

  if (!isGroqConfigured()) {
    if (!missingKeyLogged) {
      console.error('[threattrace] GROQ_API_KEY is not set; using description-based fallback summaries.')
      missingKeyLogged = true
    }
    return fallback()
  }

  try {
    const parsed = parseSummary(await callGroq(SUMMARY_PROMPT, buildPrompt(item), MAX_SUMMARY_TOKENS))
    if (parsed) return { summary: parsed, ai: true }
    console.error(`[threattrace] Groq summary could not be parsed for "${item.title}"`)
  } catch (error) {
    console.error(`[threattrace] Groq summarize failed for "${item.title}":`, (error as Error).message)
  }
  return fallback()
}

// Briefs are generated on demand rather than during a refresh, so this is the
// only place the model is asked for one. A 429 escapes as `GroqRateLimitError`
// so the endpoint can answer `queue busy`; every other failure — no key,
// malformed JSON — returns null.
export async function requestBrief(blink: Blink): Promise<AiBrief | null> {
  if (!isGroqConfigured()) return null

  const parsed = parseBrief(await callGroq(BRIEF_PROMPT, buildPrompt(blink), MAX_BRIEF_TOKENS))
  if (!parsed) console.error(`[threattrace] Groq brief could not be parsed for "${blink.title}"`)
  return parsed
}
