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

/** Vote column: arrows + running score, classic forum style. */
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
    'flex w-full items-center justify-center py-1.5 transition disabled:opacity-40 leading-none'
  return (
    <div className="flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-[#e5e7eb] bg-[#f7f7f7] dark:border-slate-700 dark:bg-slate-800/60">
      <button
        type="button"
        onClick={() => onVote(1)}
        disabled={pending !== null}
        aria-label="Upvote"
        aria-pressed={myVote === 1}
        title="Upvote"
        className={
          btn +
          (myVote === 1
            ? ' text-[#0b4dc0] dark:text-blue-400'
            : ' text-slate-400 hover:text-[#0b4dc0] dark:hover:text-blue-400')
        }
      >
        <svg
          width="15"
          height="15"
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
          'text-sm font-bold tabular-nums ' +
          (pending !== null
            ? 'opacity-40'
            : score > 0
              ? 'text-[#0b4dc0] dark:text-blue-400'
              : score < 0
                ? 'text-[#16a34a] dark:text-emerald-400'
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
        title="Downvote"
        className={
          btn +
          (myVote === -1
            ? ' text-[#16a34a] dark:text-emerald-400'
            : ' text-slate-400 hover:text-[#c62828] dark:hover:text-rose-400')
        }
      >
        <svg
          width="15"
          height="15"
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
  const rankColor =
    rank === 1
      ? 'bg-[#fff8e1] text-[#b8860b] dark:bg-[#3a3010] dark:text-amber-300'
      : rank === 2
        ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
        : rank === 3
          ? 'bg-[#fdf1e7] text-[#a05a2c] dark:bg-[#3a2515] dark:text-orange-300'
          : 'bg-[#f7f7f7] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400'

  return (
    <article
      className={
        'flex items-stretch overflow-hidden rounded-[4px] border bg-white transition-shadow hover:shadow-sm dark:bg-slate-900 ' +
        (rank === 1 ? 'border-[#e6b800]' : 'border-[#e5e7eb] dark:border-slate-700')
      }
    >
      {rank !== undefined && (
        <div
          className={
            'flex w-9 shrink-0 items-center justify-center border-r border-[#e5e7eb] text-sm font-bold dark:border-slate-700 ' +
            rankColor
          }
          aria-label={`Rank ${rank}`}
        >
          #{rank}
        </div>
      )}

      <VoteColumn score={displayScore} myVote={my} pending={pending} onVote={(v) => void onVote(v)} />

      <a
        href={post.url}
        target="_blank"
        rel="noopener nofollow"
        tabIndex={-1}
        aria-hidden="true"
        className="shrink-0 self-center p-2 pl-2.5"
      >
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt=""
            loading="lazy"
            width={68}
            height={68}
            className="h-[68px] w-[68px] rounded-[3px] border border-[#e2e2e2] bg-white object-cover dark:border-slate-700 dark:bg-slate-800"
          />
        ) : (
          <span className="flex h-[68px] w-[68px] items-center justify-center rounded-[3px] border border-[#e2e2e2] bg-[#f7f7f7] text-2xl dark:border-slate-700 dark:bg-slate-800/60">
            {CATEGORY_EMOJI[post.category]}
          </span>
        )}
      </a>

      <div className="flex min-w-0 grow flex-col justify-center gap-1 py-2.5 pr-3">
        {(post.price || post.listPrice) && (
          <div className="flex flex-wrap items-baseline gap-x-2 sm:hidden">
            {post.price && (
              <span className="text-lg font-bold leading-none text-[#16a34a] dark:text-emerald-400">
                {post.price}
              </span>
            )}
            {post.listPrice && (
              <span className="text-xs text-slate-400 line-through">{post.listPrice}</span>
            )}
          </div>
        )}
        <a
          href={post.url}
          target="_blank"
          rel="noopener nofollow"
          className="text-[15px] font-bold leading-snug text-[#1155cc] hover:underline dark:text-blue-400"
        >
          {post.title}
        </a>
        {!post.price && post.listPrice && (
          <span className="text-xs text-slate-400 line-through">{post.listPrice}</span>
        )}

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {post.merchant && (
            <span className="font-bold text-slate-600 dark:text-slate-300">{post.merchant}</span>
          )}
          <span aria-hidden>|</span>
          <Link
            to={`/browse/${post.category}`}
            className="hover:text-[#0b4dc0] hover:underline dark:hover:text-blue-400"
          >
            {CATEGORY_LABELS[post.category]}
          </Link>
          <span aria-hidden>|</span>
          <span aria-label={`${voteCount} votes`}>{voteCount} votes</span>
          <span aria-hidden>|</span>
          <span>by {post.authorName}</span>
          <span aria-hidden>|</span>
          <span>{timeAgo(post.createdAt)}</span>
          {post.source === 'import' && (
            <span className="rounded-[3px] bg-[#fff3e0] px-1 py-px text-[10px] font-bold text-[#a05a2c] uppercase dark:bg-orange-500/10 dark:text-orange-300">
              Fire
            </span>
          )}
          {mine && isToday && (
            <span className="font-bold text-[#16a34a] dark:text-emerald-400">
              {voteCount >= MIN_VOTES
                ? 'On today’s Top 10'
                : `${votesLeft} more vote${votesLeft === 1 ? '' : 's'} to make the Top 10`}
            </span>
          )}
          {mine && !isToday && <span>Voting closed (yesterday's board)</span>}
        </div>
      </div>

      <div className="hidden w-28 shrink-0 flex-col items-end justify-center gap-0.5 pr-4 text-right sm:flex">
        {post.price && (
          <span className="text-xl font-bold leading-tight text-[#16a34a] dark:text-emerald-400">
            {post.price}
          </span>
        )}
        {post.listPrice && (
          <span className="text-xs text-slate-400 line-through">{post.listPrice}</span>
        )}
      </div>

      {mine && user && (
        <div className="flex items-center pr-2.5">
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={deleting}
            className="rounded-[3px] p-1.5 text-slate-400 transition hover:bg-[#fdecea] hover:text-[#c62828] disabled:opacity-50 dark:hover:bg-rose-500/10"
            aria-label="Delete deal"
            title="Delete deal"
          >
            <svg
              width="15"
              height="15"
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
