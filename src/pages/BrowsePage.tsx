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
    (searchParams.get('sort') === 'new' ? 'new' : 'top') as BrowseSort,
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
      <nav className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 py-1.5" aria-label="Categories">
        <CategoryChip to="/browse" active={category === 'all'} label="All Deals" />
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c.id}
            to={`/browse/${c.id}`}
            active={category === c.id}
            label={c.label}
          />
        ))}
      </nav>

      {/* Search + sort */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e5e7eb] pb-3 dark:border-slate-700">
        <div className="relative min-w-52 grow">
          <svg
            className="absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400"
            width="14"
            height="14"
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
            className="w-full rounded-[4px] border border-[#d1d5db] bg-white py-1.5 pr-3 pl-8 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0b4dc0] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center text-xs font-bold">
          <span className="mr-1.5 text-slate-400">Sort:</span>
          {(
            [
              ['top', 'Top voted'],
              ['new', 'Newest'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSort(id)}
              className={
                'px-2 py-1 transition ' +
                (sort === id
                  ? 'bg-[#0b4dc0] text-white'
                  : 'text-[#0b4dc0] hover:underline dark:text-blue-400')
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
        'shrink-0 whitespace-nowrap rounded-[3px] border px-3 py-1.5 text-xs font-bold transition ' +
        (active
          ? 'border-[#0b4dc0] bg-[#0b4dc0] text-white'
          : 'border-[#d1d5db] bg-white text-slate-600 hover:border-[#0b4dc0] hover:text-[#0b4dc0] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-400')
      }
    >
      {label}
    </Link>
  )
}
