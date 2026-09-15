import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { auth, db, logAppEvent } from '../lib/firebase'
import { castVote } from '../lib/voting'
import type { VoteValue } from '../lib/models'

interface AuthContextValue {
  user: User | null
  loading: boolean
  /** True when the current session is an anonymous (voting-only) identity. */
  isAnonymous: boolean
  /** This browser's votes: postId → 1 | -1. */
  myVotes: Map<string, VoteValue>
  /** Email/password registration (required to post deals). */
  signUp(email: string, password: string, displayName: string): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  /** Cast, switch, or toggle a vote. Works anonymously. */
  vote(postId: string, value: VoteValue): Promise<VoteValue | 0>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [myVotes, setMyVotes] = useState<Map<string, VoteValue>>(new Map())

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        setUser(u)
        setLoading(false)
        setMyVotes(new Map())
        if (u) {
          try {
            const snap = await getDocs(query(collection(db, 'votes'), where('voterId', '==', u.uid)))
            const votes = new Map<string, VoteValue>()
            snap.forEach((d) => {
              const v = d.data()['value']
              if (v === 1 || v === -1) votes.set(d.data()['postId'] as string, v)
            })
            setMyVotes(votes)
          } catch (err) {
            console.warn('Could not load your votes', err)
          }
        }
      }),
    [],
  )

  async function signUp(email: string, password: string, displayName: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName.trim()) await updateProfile(cred.user, { displayName: displayName.trim() })
    logAppEvent('sign_up', { method: 'password' })
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
    logAppEvent('login', { method: 'password' })
  }

  async function signOut() {
    // Signing out of a member session keeps this browser voting: fall back to an
    // anonymous identity only when the next vote happens (lazy), not here.
    await fbSignOut(auth)
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }

  async function vote(postId: string, value: VoteValue): Promise<VoteValue | 0> {
    const result = await castVote(postId, value)
    setMyVotes((prev) => {
      const next = new Map(prev)
      if (result.value === 0) next.delete(postId)
      else next.set(postId, result.value)
      return next
    })
    logAppEvent('vote', { value: result.value })
    return result.value
  }

  const value: AuthContextValue = {
    user,
    loading,
    isAnonymous: user?.isAnonymous ?? false,
    myVotes,
    signUp,
    signIn,
    signOut,
    resetPassword,
    vote,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Silently get a voting identity (anonymous sign-in on first use). */
export async function ensureVoterSession(): Promise<User> {
  if (auth.currentUser) return auth.currentUser
  return signInAnonymously(auth).then((cred) => cred.user)
}
