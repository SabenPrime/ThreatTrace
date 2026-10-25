import type { FilterKey, Severity } from './types'

export function timeAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return 'just now'
  const diff = Math.max(0, now - new Date(iso).getTime())
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export const SEVERITY_META: Record<Severity, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#FF3B3B' },
  high: { label: 'High', color: '#FFB020' },
  medium: { label: 'Medium', color: '#555555' },
}

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'ransomware', label: 'Ransomware' },
  { key: 'zero-day', label: 'Zero-Day' },
  { key: 'breach', label: 'Breach' },
  { key: 'patches', label: 'Patches' },
]
