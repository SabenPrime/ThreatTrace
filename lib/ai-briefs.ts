import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { AiBrief } from './types'

// Briefs are generated on demand, so they have to outlive the request and the
// isolate that produced them: KV keeps them for 30 days instead of the few
// minutes an in-memory Map survives.
const TTL_SECONDS = 60 * 60 * 24 * 30

// Only the two calls this module makes are typed, so the helper does not depend
// on the generated CloudflareEnv global.
interface BriefKv {
  get(key: string, type: 'json'): Promise<unknown>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

function briefKv(): BriefKv | null {
  try {
    // `getCloudflareContext` throws outside a Cloudflare request (plain
    // `next dev` without wrangler), and the binding is simply missing when the
    // namespace has not been provisioned, so both cases fall through to null
    // and the caller generates the brief instead of reading it.
    const env = getCloudflareContext().env as unknown as { AI_BRIEFS?: BriefKv }
    return env.AI_BRIEFS ?? null
  } catch {
    return null
  }
}

function isBrief(value: unknown): value is AiBrief {
  if (!value || typeof value !== 'object') return false
  const brief = value as Partial<AiBrief>
  return typeof brief.tldr === 'string' && brief.tldr.length > 0
}

export function briefKey(id: string): string {
  return `brief:${id}`
}

export async function readBrief(id: string): Promise<AiBrief | null> {
  const kv = briefKv()
  if (!kv) return null
  try {
    const value = await kv.get(briefKey(id), 'json')
    return isBrief(value) ? value : null
  } catch (error) {
    console.error(`[threattrace] reading brief ${id} from KV failed:`, (error as Error).message)
    return null
  }
}

export async function writeBrief(id: string, brief: AiBrief): Promise<void> {
  const kv = briefKv()
  if (!kv) return
  try {
    await kv.put(briefKey(id), JSON.stringify(brief), { expirationTtl: TTL_SECONDS })
  } catch (error) {
    console.error(`[threattrace] writing brief ${id} to KV failed:`, (error as Error).message)
  }
}
