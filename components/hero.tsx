'use client'

import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { useBlinks } from '@/hooks/use-blinks'

const ease = [0.22, 1, 0.36, 1] as const

export function Hero() {
  const { data } = useBlinks()
  const blinks = data?.blinks ?? []
  const critical = blinks.filter((b) => b.severity === 'critical').length
  const cves = new Set(blinks.flatMap((b) => b.cves)).size

  const stats = [
    { value: blinks.length, label: 'Active blinks' },
    { value: critical, label: 'Critical now', accent: true },
    { value: cves, label: 'CVEs tracked' },
    { value: 5, label: 'Intel sources' },
  ]

  return (
    <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32" aria-labelledby="hero-heading">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur"
      >
        <span className="size-1.5 rounded-full bg-signal" aria-hidden="true" />
        Refreshed every 15 minutes
      </motion.div>

      <motion.h1
        id="hero-heading"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05, ease }}
        className="mt-8 max-w-4xl text-balance font-display text-[44px] font-bold leading-[0.98] tracking-[-0.045em] sm:text-7xl lg:text-[88px]"
      >
        <span className="text-gradient">Every threat.</span>
        <br />
        <span className="text-white/35">One blink.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.12, ease }}
        className="mt-8 max-w-md text-sm leading-relaxed text-muted-foreground"
      >
        All cyber events worldwide, summarized in 15 seconds.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.18, ease }}
        className="mt-10 flex flex-wrap items-center gap-3"
      >
        <a
          href="#feed"
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Read today&apos;s blinks
          <ArrowDown className="size-4" aria-hidden="true" />
        </a>
        <span className="font-mono text-[11px] text-muted-foreground">No signup. No noise.</span>
      </motion.div>

      <motion.dl
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.3, ease }}
        className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-4"
      >
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-2 bg-background/90 p-5 sm:p-6">
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{s.label}</dt>
            <dd
              className={`font-display text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl ${s.accent ? 'text-critical' : 'text-white'}`}
            >
              {String(s.value).padStart(2, '0')}
            </dd>
          </div>
        ))}
      </motion.dl>
    </section>
  )
}
