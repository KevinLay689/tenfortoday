import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '../lib/models'
import { fetchMyPosts } from '../lib/queries'
import { DealCard } from '../components/DealCard'
import { CardSkeleton, EmptyState } from '../components/EmptyState'
import { friendlyAuthError } from '../lib/authErrors'
import { useAuth } from '../context/AuthContext'

export function MyPostsPage() {
  const { user, isAnonymous, loading } = useAuth()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      setPosts(await fetchMyPosts(user))
    } catch (err) {
      setError(friendlyAuthError(err))
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return null

  if (!user || isAnonymous) {
    return (
      <EmptyState icon="🔒" title="Members only">
        Your posts live here — <Link to="/settings" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">sign in or join free</Link> to start
        sharing deals.
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            Your deals
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track votes and keep an eye on today&apos;s Top 10 race.
          </p>
        </div>
        <Link
          to="/submit"
          className="rounded-[4px] bg-[#0b4dc0] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0a43a8]"
        >
          + Post a deal
        </Link>
      </div>

      {error && (
        <div className="rounded-[4px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {!posts && !error && (
        <div className="flex flex-col gap-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {posts && posts.length === 0 && (
        <EmptyState icon="📦" title="No deals yet">
          Post your first deal with your affiliate link — if the community votes it up, it lands on
          today&apos;s Top 10 board.{' '}
          <Link to="/submit" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Post a deal
          </Link>
        </EmptyState>
      )}

      {posts && posts.length > 0 && (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <DealCard key={p.id} post={p} mine onDeleted={(id) => setPosts(posts.filter((x) => x.id !== id))} />
          ))}
        </div>
      )}
    </div>
  )
}
