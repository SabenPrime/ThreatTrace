import Link from 'next/link'
import { SITE_NAME } from '@/config/site'
import { LiveIndicator } from './live-indicator'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="font-display text-[17px] font-bold tracking-[-0.04em] text-white transition-opacity hover:opacity-80"
          aria-label={`${SITE_NAME} home`}
        >
          {SITE_NAME.toUpperCase()}
        </Link>
        <LiveIndicator />
      </div>
    </header>
  )
}
