import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { friendlyAuthError } from '../lib/authErrors'

type Mode = 'signin' | 'join'

export function AuthForms({ onDone }: { onDone?: () => void }) {
  const { signIn, signUp, resetPassword } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const input =
    'w-full rounded-[4px] border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (mode === 'join' && password.length < 8) {
      toast('Password must be at least 8 characters.', 'error')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
        toast('Welcome back! You can now post deals.', 'success')
      } else {
        await signUp(email.trim(), password, name)
        toast('Account created — welcome aboard! 🎉', 'success')
      }
      onDone?.()
    } catch (err) {
      toast(friendlyAuthError(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function forgot() {
    if (!email.trim()) {
      toast('Enter your email first, then tap “Forgot password”.', 'info')
      return
    }
    try {
      await resetPassword(email.trim())
      toast('Password reset email sent — check your inbox.', 'success')
    } catch (err) {
      toast(friendlyAuthError(err), 'error')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 rounded-[4px] bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
        {(['signin', 'join'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              'rounded-lg py-2 transition ' +
              (mode === m
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400')
            }
          >
            {m === 'signin' ? 'Sign in' : 'Join'}
          </button>
        ))}
      </div>

      {mode === 'join' && (
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Display name
          <input
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="DealHunter42"
            maxLength={30}
            autoComplete="nickname"
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
        Email
        <input
          className={input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
        Password
        <input
          className={input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'join' ? 'At least 8 characters' : '••••••••'}
          autoComplete={mode === 'join' ? 'new-password' : 'current-password'}
          required
          minLength={8}
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="mt-1 rounded-[4px] bg-[#0b4dc0] py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0a43a8] disabled:opacity-50"
      >
        {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <button type="button" onClick={() => void forgot()} className="hover:underline">
          Forgot password?
        </button>
        <span>
          {mode === 'signin' ? 'New here? Join to post deals.' : 'Already a member? Sign in.'}
        </span>
      </div>
    </form>
  )
}
