import type { Category, RawItem, Severity } from './types'

const CRITICAL_PATTERNS = [
  /remote code execution/i,
  /\bRCE\b/,
  /zero[- ]?day/i,
  /\b0[- ]day\b/i,
  /actively exploited/i,
  /exploited in the wild/i,
  /ransomware/i,
]

const BREACH_PATTERN = /\b(breach|breached|leak|leaked|stolen|exposed|data theft|compromised)\b/i
const LARGE_SCALE_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(million|billion|m\b|bn\b)|(\d{1,3}(?:,\d{3}){2,})/i

const HIGH_PATTERNS = [
  /\bpatch(es|ed)?\b/i,
  /security update/i,
  /\bfix(es|ed)?\b/i,
  /vulnerabilit/i,
  /CVE-\d{4}-\d+/i,
  /malware/i,
  /botnet/i,
  /trojan/i,
  /backdoor/i,
  /spyware/i,
  /stealer/i,
  /\bexploit/i,
  /\bAPT\d*\b/,
  /supply[- ]chain/i,
  /wiper/i,
]

const CATEGORY_PATTERNS: Record<Category, RegExp> = {
  ransomware: /ransomware|extortion|lockbit|blackcat|akira|clop|qilin/i,
  'zero-day': /zero[- ]?day|\b0[- ]day\b|actively exploited|exploited in the wild|known exploited/i,
  breach: /\b(breach|breached|data leak|leaked|stolen data|exposed|data theft|hacked|compromised)\b/i,
  patches: /\bpatch(es|ed)?\b|security update|\bupdate[sd]?\b|\bfix(es|ed)?\b|advisory|hotfix/i,
}

const PRODUCTS: [RegExp, string][] = [
  [/\bwindows\b/i, 'Windows'],
  [/\bexchange\b/i, 'Exchange'],
  [/sharepoint/i, 'SharePoint'],
  [/\boutlook\b/i, 'Outlook'],
  [/\bazure\b|entra/i, 'Azure'],
  [/\boffice\b|microsoft 365|m365/i, 'Office'],
  [/microsoft/i, 'Microsoft'],
  [/cisco/i, 'Cisco'],
  [/forti(net|os|gate|web|manager)/i, 'Fortinet'],
  [/palo alto|pan-os|globalprotect/i, 'Palo Alto'],
  [/ivanti/i, 'Ivanti'],
  [/vmware|esxi|vcenter/i, 'VMware'],
  [/chrome|chromium/i, 'Chrome'],
  [/android/i, 'Android'],
  [/\bios\b|iphone|ipad/i, 'iOS'],
  [/macos/i, 'macOS'],
  [/\bapple\b/i, 'Apple'],
  [/linux|kernel/i, 'Linux'],
  [/oracle/i, 'Oracle'],
  [/\bsap\b/i, 'SAP'],
  [/citrix|netscaler/i, 'Citrix'],
  [/adobe/i, 'Adobe'],
  [/wordpress/i, 'WordPress'],
  [/atlassian|confluence|jira/i, 'Atlassian'],
  [/\baws\b|amazon web services/i, 'AWS'],
  [/github/i, 'GitHub'],
  [/\bnpm\b/i, 'npm'],
  [/pypi/i, 'PyPI'],
  [/docker/i, 'Docker'],
  [/kubernetes|\bk8s\b/i, 'Kubernetes'],
  [/sonicwall/i, 'SonicWall'],
  [/juniper/i, 'Juniper'],
  [/\bf5\b|big-ip/i, 'F5'],
  [/firefox|mozilla/i, 'Firefox'],
  [/samsung/i, 'Samsung'],
  [/qualcomm/i, 'Qualcomm'],
  [/veeam/i, 'Veeam'],
  [/okta/i, 'Okta'],
  [/salesforce/i, 'Salesforce'],
  [/cloudflare/i, 'Cloudflare'],
  [/openssl/i, 'OpenSSL'],
  [/apache/i, 'Apache'],
  [/zimbra/i, 'Zimbra'],
  [/moveit/i, 'MOVEit'],
  [/beyondtrust/i, 'BeyondTrust'],
  [/synology/i, 'Synology'],
  [/qnap/i, 'QNAP'],
  [/tp-link/i, 'TP-Link'],
  [/d-link/i, 'D-Link'],
  [/whatsapp/i, 'WhatsApp'],
  [/telegram/i, 'Telegram'],
  [/\bgoogle\b/i, 'Google'],
  [/openai|chatgpt/i, 'OpenAI'],
  [/\bai\b|llm/i, 'AI'],
]

export function extractCves(text: string): string[] {
  const matches = text.match(/CVE-\d{4}-\d{4,7}/gi) ?? []
  return [...new Set(matches.map((m) => m.toUpperCase()))].slice(0, 4)
}

export function scoreSeverity(item: RawItem): Severity {
  const text = `${item.title} ${item.description}`
  if (item.kev?.ransomware) return 'critical'
  if (CRITICAL_PATTERNS.some((p) => p.test(text))) return 'critical'
  if (BREACH_PATTERN.test(text) && LARGE_SCALE_PATTERN.test(text)) {
    const match = text.match(LARGE_SCALE_PATTERN)
    if (match && (match[2] || match[3])) return 'critical'
  }
  if (item.kev) return 'high'
  if (HIGH_PATTERNS.some((p) => p.test(text))) return 'high'
  return 'medium'
}

export function categorize(item: RawItem): Category[] {
  const text = `${item.title} ${item.description}`
  const cats = (Object.keys(CATEGORY_PATTERNS) as Category[]).filter((c) =>
    CATEGORY_PATTERNS[c].test(text),
  )
  if (item.kev && !cats.includes('zero-day')) cats.push('zero-day')
  if (item.kev?.ransomware && !cats.includes('ransomware')) cats.push('ransomware')
  return cats
}

export function extractTags(item: RawItem): string[] {
  const text = `${item.title} ${item.description}`
  const tags = [...(item.extraTags ?? [])]
  for (const [pattern, label] of PRODUCTS) {
    if (tags.length >= 4) break
    if (pattern.test(text) && !tags.includes(label)) {
      if (label === 'Microsoft' && tags.some((t) => ['Windows', 'Exchange', 'SharePoint', 'Outlook', 'Azure', 'Office'].includes(t))) continue
      if (label === 'Apple' && tags.some((t) => ['iOS', 'macOS'].includes(t))) continue
      tags.push(label)
    }
  }
  return tags.slice(0, 4)
}

export const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2 }
