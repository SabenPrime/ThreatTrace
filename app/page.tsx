import { Backdrop } from '@/components/backdrop'
import { BlinkFeed } from '@/components/blink-feed'
import { Hero } from '@/components/hero'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export const revalidate = 300

// The homepage is fully static: it renders the shell instantly and the client
// components load the feed from /api/news. No data is fetched at build time, so
// the page can never get stuck on an old snapshot.
export default function HomePage() {
  return (
    <>
      <Backdrop />
      <SiteHeader />
      <main className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <Hero />
        <BlinkFeed />
      </main>
      <SiteFooter />
    </>
  )
}
