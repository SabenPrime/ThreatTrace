'use client'

import { FILTERS } from '@/lib/format'
import type { FilterKey } from '@/lib/types'
import { cn } from '@/lib/utils'

interface FilterPillsProps {
  active: FilterKey
  counts: Record<FilterKey, number>
  onChange: (key: FilterKey) => void
}

export function FilterPills({ active, counts, onChange }: FilterPillsProps) {
  return (
    <div
      role="group"
      aria-label="Filter blinks"
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {FILTERS.map(({ key, label }) => {
        const isActive = key === active
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(key)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60',
              isActive
                ? 'border-white bg-white text-black'
                : 'border-white/10 bg-transparent text-white/70 hover:border-white/20 hover:text-white',
            )}
          >
            {label}
            <span className={cn('font-mono text-[11px]', isActive ? 'text-black/50' : 'text-white/30')}>
              {counts[key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
