import { useCallback, useEffect, useState } from 'react'
import { MIN_VOTES } from '../lib/models'
import { fetchTodayFeed } from '../lib/queries'
import type { TodayFeed } from '../lib/queries'
import { DealCard } from '../components/DealCard'
import { CardSkeleton, EmptyState } from '../components/EmptyState'
import { friendlyAuthError } from '../lib/authErrors'

export function Top10Page() {
  const [feed, setFeed] = useState<TodayFeed | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setFeed(await fetchTodayFeed())
    } catch (err) {
      setError(friendlyAuthError(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e5e7eb] dark:border-slate-700 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
            Today's Top 10 Deals
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Ranked by community votes — a deal needs {MIN_VOTES} votes to make the board. Resets
            nightly at midnight PST.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-[4px] border border-[#d1d5db] bg-white px-3 py-1.5 text-xs font-bold text-[#0b4dc0] transition hover:border-[#0b4dc0] dark:border-slate-600 dark:bg-slate-900 dark:text-blue-400"
          title="Refresh rankings"
        >
          ⟳ Refresh
        </button>
      </section>

      {error && (
        <div className="rounded-[4px] border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {!feed && !error && (
        <div className="flex flex-col gap-2">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {feed && (
        <>
          {feed.top.length > 0 && (
            <ol className="flex flex-col gap-2">
              {feed.top.map((p, i) => (
                <li key={p.id}>
                  <DealCard post={p} rank={i + 1} />
                </li>
              ))}
            </ol>
          )}

          {feed.top.length === 0 && (
            <EmptyState icon="🗳️" title="Waiting for today's votes">
              {feed.rest.length > 0 ? (
                <>
                  No deal has {MIN_VOTES} votes yet. The Top 10 fills up as the community votes —{' '}
                  be one of the first on the deals below.
                </>
              ) : (
                <>Today&apos;s board is empty and resets every midnight PST. Check back soon, or be the first to post a deal!</>
              )}
            </EmptyState>
          )}

          {feed.rest.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-sm font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  {feed.top.length > 0 ? "Also today — vote to rank them" : "Today's deals — vote to build the Top 10"}
                </h2>
                <span className="text-xs text-slate-400">
                  needs {MIN_VOTES}+ votes to qualify
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {feed.rest.map((p) => (
                  <DealCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          )}

          {feed.top.length === 0 && feed.rest.length === 0 && (
            <p className="text-center text-xs text-slate-400">
              Tip: new deals are imported from Slickdeals every morning.
            </p>
          )}
        </>
      )}
    </div>
  )
}
