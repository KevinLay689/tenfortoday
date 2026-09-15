import type { Timestamp } from 'firebase/firestore'

export type Category =
  | 'tech'
  | 'home'
  | 'gaming'
  | 'fashion'
  | 'beauty'
  | 'sports'
  | 'toys'
  | 'auto'
  | 'grocery'
  | 'other'

export type VoteValue = 1 | -1

export interface Post {
  id: string
  title: string
  url: string
  price: string
  /** Original/list price — shown struck-through next to the deal price. */
  listPrice: string
  merchant: string
  description: string
  imageUrl: string
  category: Category
  /** YYYY-MM-DD in America/Los_Angeles — the deal's contest day. */
  dayKey: string
  createdAt: Timestamp | null
  authorUid: string
  authorName: string
  source: 'user' | 'import'
  upvotes: number
  downvotes: number
  score: number
  voteCount: number
}

/** Votes needed for a deal to qualify for the Top 10. */
export const MIN_VOTES = 5
/** Size of the daily leaderboard. */
export const TOP_N = 10
