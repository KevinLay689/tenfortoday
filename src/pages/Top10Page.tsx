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
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 px-6 py-8 text-white shadow-lg sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full bg-amber-400/20 blur-2xl" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold tracking-wide text-amber-300 uppercase">
              🏆 Daily leaderboard
            </p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Today&apos;s Top 10 Deals
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-blue-100">
              The community&apos;s 10 best deals of the day, ranked by votes. A deal needs{' '}
              <strong className="text-amber-300">{MIN_VOTES} votes</strong> to make the board, and
              everything resets at <strong className="text-amber-300">midnight PST</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20"
            title="Refresh rankings"
          >
            ⟳ Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {!feed && !error && (
        <div className="flex flex-col gap-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {feed && (
        <>
          {feed.top.length > 0 && (
            <ol className="flex flex-col gap-3">
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
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-sm font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  {feed.top.length > 0 ? "Also today — vote to rank them" : "Today's deals — vote to build the Top 10"}
                </h2>
                <span className="text-xs text-slate-400">
                  needs {MIN_VOTES}+ votes to qualify
                </span>
              </div>
              <div className="flex flex-col gap-3">
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
