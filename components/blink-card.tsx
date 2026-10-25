'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { SEVERITY_META, timeAgo } from '@/lib/format'
import type { Blink } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SeverityDot } from './severity-dot'

interface BlinkCardProps {
  blink: Blink
  index: number
  now: number | null
  featured?: boolean
}

export function BlinkCard({ blink, index, now, featured = false }: BlinkCardProps) {
  const summary = [blink.summary.what, blink.summary.impact, blink.summary.action]
  const severity = blink.severity

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.5, delay: Math.min(index, 12) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={cn(featured && 'md:col-span-2')}
    >
      <Link
        href={`/blink/${blink.id}`}
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-md transition-all duration-300',
          'hover:border-white/[0.15] hover:bg-white/[0.045] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_60px_-20px_rgba(34,211,238,0.18)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60',
        )}
      >
        {severity === 'critical' && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 size-48 rounded-full bg-critical/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          {severity === 'medium' ? (
            <>
              <SeverityDot severity={severity} />
              <span className="sr-only">{SEVERITY_META[severity].label} severity.</span>
            </>
          ) : (
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-px text-[10px] uppercase tracking-[0.12em]"
              style={{ borderColor: `${SEVERITY_META[severity].color}40`, color: SEVERITY_META[severity].color }}
            >
              <SeverityDot severity={severity} />
              {SEVERITY_META[severity].label}
            </span>
          )}
          <span className="truncate text-white/70">{blink.source}</span>
          <span aria-hidden="true" className="text-white/20">
            /
          </span>
          <time dateTime={blink.publishedAt} suppressHydrationWarning>
            {timeAgo(blink.publishedAt, now ?? undefined)}
          </time>
          <ArrowUpRight
            aria-hidden="true"
            className="ml-auto size-4 -translate-x-1 translate-y-1 text-white/0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-white/60"
          />
        </div>

        <h3
          className={cn(
            'mt-4 text-pretty font-semibold leading-snug text-white',
            featured ? 'font-display text-xl tracking-tight sm:text-2xl' : 'text-base',
          )}
        >
          {blink.title}
        </h3>

        <p
          className={cn(
            'mt-3 text-sm leading-relaxed text-muted-foreground',
            featured ? 'line-clamp-4' : 'line-clamp-3',
          )}
        >
          {summary.join(' ')}
        </p>

        {(blink.tags.length > 0 || blink.cves.length > 0) && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-6" aria-label="Tags">
            {blink.cves.slice(0, 1).map((cve) => (
              <li
                key={cve}
                className="rounded-full border border-signal/20 bg-signal/[0.06] px-2 py-0.5 font-mono text-[10px] text-signal"
              >
                {cve}
              </li>
            ))}
            {blink.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-white/[0.08] px-2 py-0.5 font-mono text-[10px] text-white/60"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </Link>
    </motion.article>
  )
}
