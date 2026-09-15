import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORY_EMOJI, CATEGORY_LABELS } from '../lib/constants'
import { MIN_VOTES } from '../lib/models'
import type { Post, VoteValue } from '../lib/models'
import { deletePost } from '../lib/queries'
import { timeAgo, todayKeyPST } from '../lib/time'
import { friendlyAuthError } from '../lib/authErrors'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const MEDALS = ['👑', '🥈', '🥉'] as const

/** Vote column: arrow up, live score, arrow down. Toggling your own vote works. */
function VoteColumn({
  score,
  myVote,
  pending,
  onVote,
}: {
  score: number
  myVote: VoteValue | 0
  pending: VoteValue | null
  onVote: (value: VoteValue) => void
}) {
  const btn =
    'flex w-full items-center justify-center rounded-lg py-2 transition disabled:opacity-40'
  return (
    <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
      <button
        type="button"
        onClick={() => onVote(1)}
        disabled={pending !== null}
        aria-label="Upvote"
        aria-pressed={myVote === 1}
        className={
          btn +
          (myVote === 1
            ? ' text-blue-600 dark:text-blue-400'
            : ' text-slate-400 hover:text-blue-600 dark:hover:text-blue-400')
        }
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={myVote === 1 ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
      <span
        className={
          'text-sm font-black tabular-nums ' +
          (pending !== null
            ? 'opacity-40'
            : score > 0
              ? 'text-blue-600 dark:text-blue-400'
              : score < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-500 dark:text-slate-400')
        }
        aria-label={`${score} points`}
      >
        {score}
      </span>
      <button
        type="button"
        onClick={() => onVote(-1)}
        disabled={pending !== null}
        aria-label="Downvote"
        aria-pressed={myVote === -1}
        className={
          btn +
          (myVote === -1
            ? ' text-rose-600 dark:text-rose-400'
            : ' text-slate-400 hover:text-rose-600 dark:hover:text-rose-400')
        }
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={myVote === -1 ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="rotate-180"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  )
}

export function DealCard({
  post,
  rank,
  mine,
  onDeleted,
}: {
  post: Post
  /** 1-based leaderboard position; omit outside the Top 10. */
  rank?: number
  /** Card shown in "My Posts" — exposes delete + qualification status. */
  mine?: boolean
  onDeleted?: (id: string) => void
}) {
  const { myVotes, vote, user, liveCounters } = useAuth()
  const toast = useToast()
  const [pending, setPending] = useState<VoteValue | null>(null)
  const [deleting, setDeleting] = useState(false)

  const my = myVotes.get(post.id) ?? 0
  // Prefer the exact counters returned by this session's vote transaction; fall
  // back to the list snapshot. Never layer a guess on top of server data.
  const live = liveCounters.get(post.id)
  const displayScore = live ? live.score : post.score
  const voteCount = live ? live.voteCount : post.voteCount

  async function onVote(value: VoteValue) {
    if (pending) return
    setPending(value)
    try {
      await vote(post.id, value)
    } catch (err) {
      toast(friendlyAuthError(err), 'error')
    } finally {
      setPending(null)
    }
  }

  async function onDelete() {
    if (!post.id || deleting) return
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deletePost(post.id)
      toast('Deal deleted.', 'success')
      onDeleted?.(post.id)
    } catch (err) {
      toast(friendlyAuthError(err), 'error')
      setDeleting(false)
    }
  }

  const isToday = post.dayKey === todayKeyPST()
  const votesLeft = Math.max(0, MIN_VOTES - voteCount)

  return (
    <article
      className={
        'relative flex items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900' +
        (rank === 1 ? ' ring-2 ring-amber-400/70' : '')
      }
    >
      {rank !== undefined && (
        <div
          className={
            'flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-slate-100 text-lg font-black text-slate-400 dark:border-slate-800 ' +
            (rank === 1
              ? 'bg-gradient-to-b from-amber-50 to-white text-amber-500 dark:from-amber-500/15 dark:to-transparent'
              : rank === 2
                ? 'bg-gradient-to-b from-slate-100 to-white dark:from-slate-800 dark:to-transparent'
                : rank === 3
                  ? 'bg-gradient-to-b from-orange-50 to-white text-orange-700 dark:from-orange-500/10 dark:to-transparent'
                  : '')
          }
          aria-label={`Rank ${rank}`}
        >
          <span className={rank <= 3 ? 'text-xl leading-none' : 'text-base leading-none'}>
            {rank <= 3 ? MEDALS[rank - 1] : rank}
          </span>
        </div>
      )}

      <VoteColumn score={displayScore} myVote={my} pending={pending} onVote={(v) => void onVote(v)} />

      <div className="flex min-w-0 grow flex-col justify-center gap-1 py-3.5 pr-4">
        {(post.price || post.listPrice) && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {post.price && (
              <span className="text-xl leading-none font-black tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-2xl">
                {post.price}
              </span>
            )}
            {post.listPrice && (
              <span className="text-xs font-semibold text-slate-400 line-through">
                {post.listPrice}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <a
            href={post.url}
            target="_blank"
            rel="noopener nofollow"
            className="text-[15px] leading-snug font-semibold text-slate-900 hover:text-blue-700 hover:underline dark:text-slate-100 dark:hover:text-amber-400 sm:text-base"
          >
            {post.title}
          </a>
          {!post.price && post.listPrice && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-500 line-through dark:bg-slate-800 dark:text-slate-400">
              {post.listPrice}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {post.merchant && <span className="font-medium">{post.merchant}</span>}
          <Link
            to={`/browse/${post.category}`}
            className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 hover:bg-blue-100 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-500/20 dark:hover:text-blue-300"
          >
            {CATEGORY_LABELS[post.category]}
          </Link>
          <span aria-label={`${voteCount} votes`}>{voteCount} votes</span>
          <span aria-hidden>·</span>
          <span>by {post.authorName}</span>
          <span aria-hidden>·</span>
          <span>{timeAgo(post.createdAt)}</span>
          {post.source === 'import' && (
            <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-sky-600 uppercase dark:bg-sky-500/10 dark:text-sky-400">
              via Slickdeals
            </span>
          )}
          {mine && isToday && (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {voteCount >= MIN_VOTES
                ? 'On today’s Top 10 board'
                : `${votesLeft} more vote${votesLeft === 1 ? '' : 's'} to make the Top 10`}
            </span>
          )}
          {mine && !isToday && (
            <span className="font-medium text-slate-400">Voting closed (yesterday's board)</span>
          )}
        </div>
      </div>

      {/* Deal thumbnail (or category placeholder) — clicking opens the deal. */}
      <a
        href={post.url}
        target="_blank"
        rel="noopener nofollow"
        tabIndex={-1}
        aria-hidden="true"
        className="flex shrink-0 items-center self-center p-3 pl-0"
      >
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt=""
            loading="lazy"
            width={88}
            height={88}
            className="h-[68px] w-[68px] rounded-xl border border-slate-200/70 bg-white object-cover sm:h-[88px] sm:w-[88px] dark:border-slate-700/60 dark:bg-slate-800"
          />
        ) : (
          <span className="flex h-[68px] w-[68px] items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50 text-2xl sm:h-[88px] sm:w-[88px] dark:border-slate-700/60 dark:bg-slate-800/60">
            {CATEGORY_EMOJI[post.category]}
          </span>
        )}
      </a>

      {mine && user && (
        <div className="flex items-center pr-3">
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={deleting}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10"
            aria-label="Delete deal"
            title="Delete deal"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>
      )}
    </article>
  )
}
