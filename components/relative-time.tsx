'use client'

import { useEffect, useState } from 'react'
import { timeAgo } from '@/lib/format'

export function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => new Date(iso).toISOString().slice(0, 10))

  useEffect(() => {
    setLabel(timeAgo(iso))
  }, [iso])

  return <time dateTime={iso}>{label}</time>
}
