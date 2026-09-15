import { RESET_TIMEZONE } from './constants'

const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: RESET_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today's date key (YYYY-MM-DD) in Pacific time — the key the whole daily reset hangs on. */
export function todayKeyPST(date: Date = new Date()): string {
  return dayFmt.format(date)
}

/** Human "2h ago" style label for a Firestore timestamp (or just now while pending). */
export function timeAgo(ts: { toDate(): Date } | null | undefined): string {
  if (!ts) return 'just now'
  const then = ts.toDate().getTime()
  if (Number.isNaN(then)) return 'just now'
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}
