import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SWRConfig } from 'swr'
import { Backdrop } from '@/components/backdrop'
import { BlinkSection } from '@/components/blink-section'
import { BriefMe } from '@/components/brief-me'
import { ShareButton } from '@/components/share-button'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { SeverityDot } from '@/components/severity-dot'
import { RelativeTime } from '@/components/relative-time'
import { SEVERITY_META } from '@/lib/format'
import { getBlink, getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const blink = await getBlink(id)
  if (!blink) return { title: 'Blink not found' }
  return {
    title: blink.title,
    description: blink.summary.what,
    openGraph: { title: blink.title, description: blink.summary.what, type: 'article' },
  }
}

export default async function BlinkPage({ params }: Props) {
  const { id } = await params
  const store = await getStore()
  const blink = store.blinks.find((b) => b.id === id)
  if (!blink) notFound()

  const meta = SEVERITY_META[blink.severity]
  const sections = [
    { label: 'What happened', icon: 'what' as const, body: blink.summary.what },
    { label: 'Impact', icon: 'impact' as const, body: blink.summary.impact },
    { label: 'Action', icon: 'action' as const, body: blink.summary.action, emphasis: true },
  ]

  return (
    <SWRConfig value={{ fallback: { '/api/news': store } }}>
      <Backdrop />
      <SiteHeader />
      <main className="mx-auto max-w-[680px] px-5 pt-12 pb-8 sm:px-8 sm:pt-20">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 font-mono text-xs text-muted-foreground transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          All blinks
        </Link>

        <article className="mt-14">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em]"
              style={{ borderColor: `${meta.color}40`, color: blink.severity === 'medium' ? '#A1A1AA' : meta.color }}
            >
              <SeverityDot severity={blink.severity} />
              {meta.label}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {blink.source} · <RelativeTime iso={blink.publishedAt} />
            </span>
          </div>

          <h1 className="mt-8 text-balance font-display text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[40px]">
            {blink.title}
          </h1>

          {blink.cves.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="CVE identifiers">
              {blink.cves.map((cve) => (
                <li key={cve}>
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-signal/25 bg-signal/[0.06] px-2.5 py-1 font-mono text-xs text-signal transition-colors hover:bg-signal/[0.12]"
                  >
                    {cve}
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}

          <BriefMe id={blink.id} />

          <div className="mt-14 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            <span>The blink</span>
            <span className="h-px flex-1 bg-white/[0.08]" aria-hidden="true" />
            <span>15 sec read</span>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            {sections.map((s, i) => (
              <BlinkSection key={s.label} index={i} {...s} />
            ))}
          </div>

          {blink.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-1.5" aria-label="Affected products">
              {blink.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-white/[0.08] px-2.5 py-0.5 font-mono text-[11px] text-white/60"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-14 flex flex-col gap-3 border-t border-white/[0.06] pt-8 sm:flex-row sm:items-center">
            <a
              href={blink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Read original on {blink.source}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
            <ShareButton title={blink.title} />
          </div>

          {!blink.aiSummarized && (
            <p className="mt-6 font-mono text-[11px] leading-relaxed text-white/30">
              Summary condensed from the source description.
            </p>
          )}
        </article>
      </main>
      <SiteFooter />
    </SWRConfig>
  )
}
