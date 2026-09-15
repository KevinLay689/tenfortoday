import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CATEGORIES } from '../lib/constants'
import type { Category, Post } from '../lib/models'
import { fetchBrowse } from '../lib/queries'
import type { BrowseSort } from '../lib/queries'
import { DealCard } from '../components/DealCard'
import { CardSkeleton, EmptyState } from '../components/EmptyState'
import { friendlyAuthError } from '../lib/authErrors'

export function BrowsePage() {
  const { category: routeCategory } = useParams()
  const [searchParams] = useSearchParams()

  const category = (CATEGORIES.some((c) => c.id === routeCategory)
    ? routeCategory
    : 'all') as Category | 'all'
  const [sort, setSort] = useState<BrowseSort>(
    (searchParams.get('sort') === 'top' ? 'top' : 'new') as BrowseSort,
  )
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setPosts(null)
    setError(null)
    try {
      setPosts(await fetchBrowse(category, sort))
    } catch (err) {
      setError(friendlyAuthError(err))
    }
  }, [category, sort])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!posts) return null
    const q = search.trim().toLowerCase()
    if (!q) return posts
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.merchant.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    )
  }, [posts, search])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">
          Browse deals
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Vote on anything, from any day. The best of today also fight for the Top 10 board.
        </p>
      </div>

      {/* Categories */}
      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Categories">
        <CategoryChip to="/browse" active={category === 'all'} label="🌍 All" />
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c.id}
            to={`/browse/${c.id}`}
            active={category === c.id}
            label={`${c.emoji} ${c.label}`}
          />
        ))}
      </nav>

      {/* Search + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 grow">
          <svg
            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals…"
            aria-label="Search deals"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
          {(
            [
              ['new', 'Newest'],
              ['top', 'Top voted'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSort(id)}
              className={
                'rounded-lg px-3.5 py-1.5 transition ' +
                (sort === id
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400')
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {!filtered && !error && (
        <div className="flex flex-col gap-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <EmptyState icon="🔍" title={search ? 'No matches' : 'No deals here yet'}>
          {search ? (
            <>Nothing matches “{search}” in this list.</>
          ) : (
            <>
              This shelf is empty. <Link to="/submit" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Post the first deal</Link> — or check
              another category.
            </>
          )}
        </EmptyState>
      )}

      {filtered && filtered.length > 0 && (
        <>
          <p className="px-1 text-xs text-slate-400">
            {filtered.length} deal{filtered.length === 1 ? '' : 's'}
            {search && ` matching “${search}”`}
          </p>
          <div className="flex flex-col gap-3">
            {filtered.map((p) => (
              <DealCard key={p.id} post={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CategoryChip({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      to={to}
      className={
        'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ' +
        (active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800')
      }
    >
      {label}
    </Link>
  )
}
