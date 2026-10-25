'use client'

import useSWR from 'swr'
import type { BlinkStore } from '@/lib/types'

export const NEWS_KEY = '/api/news'
const POLL_INTERVAL = 5 * 60_000

const fetcher = async (url: string): Promise<BlinkStore> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load blinks')
  return res.json()
}

export function useBlinks() {
  return useSWR<BlinkStore>(NEWS_KEY, fetcher, {
    refreshInterval: POLL_INTERVAL,
    revalidateOnFocus: true,
    keepPreviousData: true,
  })
}
