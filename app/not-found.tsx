import Link from 'next/link'
import { Backdrop } from '@/components/backdrop'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[680px] flex-col items-start justify-center px-5 sm:px-8">
      <Backdrop />
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">404 · Signal lost</p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.03em] text-white">This blink has expired.</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Blinks rotate out after 72 hours to keep the feed sharp. Catch up on what&apos;s happening now.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-transform hover:scale-[1.02]"
      >
        Back to the feed
      </Link>
    </main>
  )
}
