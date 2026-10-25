import { SITE_NAME } from '@/config/site'
import { SOURCE_NAMES } from '@/lib/sources'

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-sm font-bold tracking-[-0.04em] text-white">{SITE_NAME.toUpperCase()}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Threat intelligence for people with 15 seconds to spare.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">Signal from</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground md:justify-end">
            {SOURCE_NAMES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="font-mono text-[11px] text-white/30">© {new Date().getFullYear()} {SITE_NAME}</p>
        </div>
      </div>
    </footer>
  )
}
