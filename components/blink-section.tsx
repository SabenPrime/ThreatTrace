'use client'

import { motion } from 'framer-motion'
import { Crosshair, ShieldCheck, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS = { what: Crosshair, impact: Users, action: ShieldCheck }

interface BlinkSectionProps {
  label: string
  body: string
  icon: keyof typeof ICONS
  index: number
  emphasis?: boolean
}

export function BlinkSection({ label, body, icon, index, emphasis = false }: BlinkSectionProps) {
  const Icon = ICONS[icon]
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.1 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex gap-5 rounded-2xl border p-6 backdrop-blur-md',
        emphasis ? 'border-signal/20 bg-signal/[0.04]' : 'border-white/[0.08] bg-white/[0.03]',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl border',
          emphasis ? 'border-signal/30 text-signal' : 'border-white/10 text-white/70',
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/50">{label}</h2>
        <p className="mt-2 text-pretty text-base leading-relaxed text-white/90">{body}</p>
      </div>
    </motion.section>
  )
}
