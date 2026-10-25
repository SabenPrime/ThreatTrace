'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useBlinks } from '@/hooks/use-blinks'
import { FILTERS } from '@/lib/format'
import type { Blink, FilterKey } from '@/lib/types'
import { BlinkCard } from './blink-card'
import { FilterPills } from './filter-pills'

function matches(blink: Blink, filter: FilterKey) {
  if (filter === 'all') return true
  if (filter === 'critical') return blink.severity === 'critical'
  return blink.categories.includes(filter)
}

export function BlinkFeed() {
  const { data } = useBlinks()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const blinks = data?.blinks ?? []

  const counts = useMemo(
    () =>
      Object.fromEntries(FILTERS.map(({ key }) => [key, blinks.filter((b) => matches(b, key)).length])) as Record<
        FilterKey,
        number
      >,
    [blinks],
  )

  const visible = useMemo(() => blinks.filter((b) => matches(b, filter)), [blinks, filter])

  return (
    <section id="feed" aria-labelledby="feed-heading" className="scroll-mt-24">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">Live feed</p>
          <h2 id="feed-heading" className="mt-3 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Today&apos;s blinks
          </h2>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="font-mono text-[11px] text-muted-foreground">
            {visible.length} of {blinks.length} · last 72h
          </p>
        </div>
      </div>

      <div className="mt-8">
        <FilterPills active={filter} counts={counts} onChange={setFilter} />
      </div>

      {visible.length > 0 ? (
        <motion.div layout className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          <AnimatePresence mode="popLayout" initial={true}>
            {visible.map((blink, i) => (
              <BlinkCard key={blink.id} blink={blink} index={i} now={now} featured={filter === 'all' && i === 0} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-20 text-center">
          <p className="font-display text-lg font-medium text-white">All quiet on this front.</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            No blinks match this filter in the last 72 hours. We check every source again every 15 minutes.
          </p>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="mt-6 rounded-full border border-white/10 px-4 py-1.5 text-[13px] text-white/80 transition-colors hover:border-white/20 hover:text-white"
          >
            Show all blinks
          </button>
        </div>
      )}
    </section>
  )
}
