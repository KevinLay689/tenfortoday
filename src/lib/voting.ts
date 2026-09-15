import {
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth, db } from './firebase'
import type { VoteValue } from './models'

export interface VoteResult {
  /** The voter's resulting stance: 1, -1, or 0 when the vote was toggled off. */
  value: VoteValue | 0
  score: number
  upvotes: number
  downvotes: number
  voteCount: number
}

/**
 * Get (or silently create) an identity for voting. Voting is anonymous: the first
 * vote triggers a Firebase anonymous sign-in whose session persists in this browser,
 * so one browser = one vote per deal.
 */
export async function ensureVoter(): Promise<User> {
  if (auth.currentUser) return auth.currentUser
  const cred = await signInAnonymously(auth)
  return cred.user
}

/**
 * Cast / switch / toggle a vote in one atomic transaction. The backend (post vote
 * counters + the per-voter vote doc) is updated immediately; lists simply refetch
 * on the next tab change or reload — rankings never reshuffle mid-page.
 */
export async function castVote(postId: string, value: VoteValue): Promise<VoteResult> {
  const voter = await ensureVoter()
  const uid = voter.uid
  const voteRef = doc(db, 'votes', `${postId}__${uid}`)
  const postRef = doc(db, 'posts', postId)

  return runTransaction(db, async (tx) => {
    const [voteSnap, postSnap] = await Promise.all([tx.get(voteRef), tx.get(postRef)])
    if (!postSnap.exists()) throw new Error('That deal no longer exists.')

    const p = postSnap.data()
    let up = Number(p['upvotes']) || 0
    let down = Number(p['downvotes']) || 0
    const prev = voteSnap.exists() ? (voteSnap.data()['value'] as VoteValue) : 0
    const next: VoteValue | 0 = prev === value ? 0 : value

    if (prev === 1) up -= 1
    else if (prev === -1) down -= 1
    if (next === 1) up += 1
    else if (next === -1) down += 1

    if (next === 0) tx.delete(voteRef)
    else tx.set(voteRef, { postId, voterId: uid, value: next, createdAt: serverTimestamp() })

    const counters = {
      upvotes: up,
      downvotes: down,
      score: up - down,
      voteCount: up + down,
    }
    tx.update(postRef, counters)
    return { value: next, ...counters }
  })
}
