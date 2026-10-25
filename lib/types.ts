export type Severity = 'critical' | 'high' | 'medium'

export type Category = 'ransomware' | 'zero-day' | 'breach' | 'patches'

export type FilterKey = 'all' | 'critical' | Category

export interface BlinkSummary {
  what: string
  impact: string
  action: string
}

export interface AiBrief {
  tldr: string
  keyPoints: string[]
  whosAtRisk: string
  action: string
  exploitStatus: string
}

export interface Blink {
  id: string
  title: string
  url: string
  source: string
  sourceId: string
  publishedAt: string
  severity: Severity
  categories: Category[]
  tags: string[]
  cves: string[]
  description: string
  summary: BlinkSummary
  // True when `summary` was written by the model rather than built from the
  // source description.
  aiSummarized: boolean
}

export interface BlinkStore {
  updatedAt: string | null
  blinks: Blink[]
}

export interface RawItem {
  title: string
  url: string
  source: string
  sourceId: string
  publishedAt: string
  description: string
  extraTags?: string[]
  cves?: string[]
  kev?: {
    vendor: string
    product: string
    requiredAction: string
    dueDate: string
    ransomware: boolean
  }
}
