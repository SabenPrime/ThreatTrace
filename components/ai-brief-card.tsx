'use client'

import { motion } from 'framer-motion'
import type { AiBrief } from '@/lib/types'

const ROWS: { label: string; key: 'whosAtRisk' | 'action' | 'exploitStatus' }[] = [
  { label: "Who's at risk", key: 'whosAtRisk' },
  { label: 'Action', key: 'action' },
  { label: 'Exploit status', key: 'exploitStatus' },
]

export function AiBriefCard({ brief }: { brief: AiBrief | null }) {
  // The brief arrives over the network, so every field is treated as optional:
  // a malformed payload renders nothing instead of blanking the page.
  if (!brief?.tldr) return null
  const keyPoints = Array.isArray(brief.keyPoints) ? brief.keyPoints : []

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-[#3b82f6] bg-white/[0.03] p-6 backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#3b82f6]">✦ AI brief</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">AI generated</span>
      </div>

      <p className="mt-5 text-pretty text-base font-semibold leading-relaxed text-white">{brief.tldr}</p>

      {keyPoints.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {keyPoints.map((point) => (
            <li key={point} className="flex gap-3 text-sm leading-relaxed text-white/80">
              <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-[#3b82f6]" />
              {point}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-6 flex flex-col gap-3 border-t border-white/[0.08] pt-5">
        {ROWS.map(({ label, key }) => (
          <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="w-28 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{label}</dt>
            <dd className="text-sm leading-relaxed text-white/80">{brief[key] ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </motion.section>
  )
}
