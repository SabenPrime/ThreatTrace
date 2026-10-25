import { SEVERITY_META } from '@/lib/format'
import type { Severity } from '@/lib/types'

export function SeverityDot({ severity }: { severity: Severity }) {
  const { color } = SEVERITY_META[severity]
  return (
    <span
      aria-hidden="true"
      className="inline-block size-1.5 shrink-0 rounded-full"
      style={{
        backgroundColor: color,
        boxShadow: severity === 'medium' ? undefined : `0 0 10px ${color}`,
      }}
    />
  )
}
