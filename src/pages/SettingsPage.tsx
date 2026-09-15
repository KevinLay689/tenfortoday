import { useEffect, useState } from 'react'
import { updateProfile } from 'firebase/auth'
import { AuthForms } from '../components/AuthForms'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { friendlyAuthError } from '../lib/authErrors'
import { MIN_VOTES, TOP_N } from '../lib/models'

export function SettingsPage() {
  const { user, isAnonymous, signOut } = useAuth()
  const toast = useToast()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setName(user?.displayName ?? '')
  }, [user])

  async function saveName() {
    if (!user || busy) return
    setBusy(true)
    try {
      await updateProfile(user, { displayName: name.trim() })
      toast('Display name updated.', 'success')
    } catch (err) {
      toast(friendlyAuthError(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your account, the rules of the board, and the fine print.
        </p>
      </div>

      {user && !isAnonymous ? (
        <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Account
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Signed in as <strong className="text-slate-900 dark:text-slate-100">{user.email}</strong>
          </p>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Display name (shown on your posts)
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => void saveName()}
                disabled={busy}
                className="rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </label>
          <button
            type="button"
            onClick={() => void signOut()}
            className="self-start rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </section>
      ) : user && isAnonymous ? (
        <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">
            You're voting anonymously
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your votes are saved in this browser. Create a free account to post your own deals and
            earn from affiliate links.
          </p>
          <AuthForms />
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Sign in / Join
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Voting is anonymous — an account is only needed to post deals.
          </p>
          <AuthForms />
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">
          How the board works
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            Each day builds its own board of the top {TOP_N} deals — highest vote score first.
          </li>
          <li>
            A deal needs at least {MIN_VOTES} votes to qualify for the Top 10.
          </li>
          <li>Everything resets at midnight, Pacific time. Tomorrow is a fresh board.</li>
          <li>Voting is anonymous and free. Posting requires a free account.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-black tracking-wide text-slate-500 uppercase dark:text-slate-400">
          About & disclosure
        </h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          TenForToday is a community deal board: members post deals (often via their own affiliate
          links and may earn a commission), everyone votes, and only the ten best deals of the day
          make the board. Deal snapshots are sourced daily from Slickdeals and marked
          accordingly.
        </p>
        <p className="text-xs text-slate-400">Votes are one per person per deal, per day's board.</p>
      </section>
    </div>
  )
}
