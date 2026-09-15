import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from './firebase'
import { todayKeyPST } from './time'
import { MIN_VOTES, TOP_N, type Category, type Post, type VoteValue } from './models'

function toPost(id: string, data: Record<string, unknown>): Post {
  return {
    id,
    title: (data['title'] as string) ?? '',
    url: (data['url'] as string) ?? '#',
    price: (data['price'] as string) ?? '',
    listPrice: (data['listPrice'] as string) ?? '',
    merchant: (data['merchant'] as string) ?? '',
    description: (data['description'] as string) ?? '',
    imageUrl: (data['imageUrl'] as string) ?? '',
    category: (data['category'] as Category) ?? 'other',
    dayKey: (data['dayKey'] as string) ?? '',
    createdAt: (data['createdAt'] as Post['createdAt']) ?? null,
    authorUid: (data['authorUid'] as string) ?? '',
    authorName: (data['authorName'] as string) ?? 'member',
    source: (data['source'] as Post['source']) ?? 'user',
    upvotes: Number(data['upvotes']) || 0,
    downvotes: Number(data['downvotes']) || 0,
    score: Number(data['score']) || 0,
    voteCount: Number(data['voteCount']) || 0,
  }
}

export interface TodayFeed {
  /** Today's qualified deals, best first — at most TOP_N. */
  top: Post[]
  /** Today's deals that haven't qualified yet (need MIN_VOTES votes). */
  rest: Post[]
}

/**
 * Today's leaderboard + the rest of today's deals worth voting on. Deliberately a
 * one-shot read (no live listeners): the community asked for updates to land on
 * refresh / tab change, not mid-scroll reshuffles.
 */
export async function fetchTodayFeed(): Promise<TodayFeed> {
  const qy = query(
    collection(db, 'posts'),
    where('dayKey', '==', todayKeyPST()),
    orderBy('score', 'desc'),
    limit(60),
  )
  const snap = await getDocs(qy)
  const all = snap.docs.map((d) => toPost(d.id, d.data()))

  const qualified = all.filter((p) => p.voteCount >= MIN_VOTES)
  const topIds = new Set(qualified.slice(0, TOP_N).map((p) => p.id))
  const top = qualified.slice(0, TOP_N)
  const rest = all
    .filter((p) => !topIds.has(p.id))
    .sort((a, b) => b.voteCount - a.voteCount || b.score - a.score)
  return { top, rest }
}

export type BrowseSort = 'new' | 'top'

/** All deals (any day) — optionally narrowed to one category, newest or top voted. */
export async function fetchBrowse(category: Category | 'all', sort: BrowseSort): Promise<Post[]> {
  const orderField = sort === 'new' ? 'createdAt' : 'score'
  const clauses = []
  if (category !== 'all') clauses.push(where('category', '==', category))
  clauses.push(orderBy(orderField, 'desc'))
  clauses.push(limit(120))
  const snap = await getDocs(query(collection(db, 'posts'), ...clauses))
  const posts = snap.docs.map((d) => toPost(d.id, d.data()))
  if (sort === 'new') {
    // Pending serverTimestamps sort last; push them to the top.
    posts.sort((a, b) => stamp(b) - stamp(a))
  }
  return posts
}

function stamp(p: Post): number {
  return p.createdAt ? p.createdAt.toMillis() : Number.MAX_SAFE_INTEGER
}

export async function fetchMyPosts(user: User): Promise<Post[]> {
  const snap = await getDocs(
    query(
      collection(db, 'posts'),
      where('authorUid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100),
    ),
  )
  return snap.docs.map((d) => toPost(d.id, d.data()))
}

export interface NewPost {
  title: string
  url: string
  category: Category
  price?: string
  merchant?: string
  description?: string
  imageUrl?: string
}

export async function createPost(user: User, data: NewPost): Promise<string> {
  const name = user.displayName || user.email?.split('@')[0] || 'member'
  const ref = await addDoc(collection(db, 'posts'), {
    title: data.title.trim(),
    url: data.url.trim(),
    category: data.category,
    price: (data.price ?? '').trim().slice(0, 40),
    listPrice: '',
    merchant: (data.merchant ?? '').trim().slice(0, 60),
    description: (data.description ?? '').trim().slice(0, 500),
    imageUrl: (data.imageUrl ?? '').trim().slice(0, 2000),
    dayKey: todayKeyPST(),
    createdAt: serverTimestamp(),
    authorUid: user.uid,
    authorName: name,
    source: 'user' as const,
    upvotes: 0,
    downvotes: 0,
    score: 0,
    voteCount: 0,
  })
  return ref.id
}

export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId))
}

/** The caller's current vote on a single deal, if any. */
export async function fetchMyVote(postId: string, uid: string): Promise<VoteValue | 0> {
  const snap = await getDoc(doc(db, 'votes', `${postId}__${uid}`))
  if (!snap.exists()) return 0
  return snap.data()['value'] as VoteValue
}
