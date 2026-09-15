import { useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { AuthForms } from './components/AuthForms'
import { Sheet } from './components/Sheet'
import { Top10Page } from './pages/Top10Page'
import { BrowsePage } from './pages/BrowsePage'
import { SubmitDealPage } from './pages/SubmitDealPage'
import { MyPostsPage } from './pages/MyPostsPage'
import { SettingsPage } from './pages/SettingsPage'
import { RESET_TIMEZONE, SITE_NAME } from './lib/constants'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  'relative rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition ' +
  (isActive
    ? 'text-blue-700 dark:text-amber-400'
    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200')

function Header({ onSignIn }: { onSignIn: () => void }) {
  const { user, isAnonymous } = useAuth()
  const navigate = useNavigate()
  const member = user && !isAnonymous

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
        <NavLink to="/" className="flex shrink-0 items-center gap-2" aria-label={SITE_NAME}>
          <img src="/logo.svg" alt="" width={30} height={30} className="rounded-lg" />
          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            tenfor<span className="text-amber-500">today</span>
          </span>
        </NavLink>

        <nav className="no-scrollbar mx-1 flex grow items-center gap-0.5 overflow-x-auto" aria-label="Tabs">
          <NavLink to="/" end className={tabClass}>
            Top 10
          </NavLink>
          <NavLink to="/browse" className={tabClass}>
            Browse
          </NavLink>
          <NavLink to="/settings" className={tabClass}>
            Settings
          </NavLink>
          {member && (
            <NavLink to="/myposts" className={tabClass}>
              My Posts
            </NavLink>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => (member ? navigate('/submit') : onSignIn())}
            className={
              'rounded-xl px-3 py-2 text-xs font-bold shadow-sm transition sm:text-sm ' +
              (member
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-amber-400 text-slate-900 hover:bg-amber-300')
            }
          >
            {member ? '+ Post a Deal' : '🔐 Post a Deal'}
          </button>
          {member ? (
            <NavLink
              to="/settings"
              className="hidden max-w-32 truncate rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 sm:block dark:bg-slate-800 dark:text-slate-200"
              title={user.email ?? undefined}
            >
              {user.displayName || user.email?.split('@')[0] || 'member'}
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="hidden rounded-xl px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50 sm:block dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200 py-8 dark:border-slate-800">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 text-center">
        <div className="flex items-center gap-1.5 text-sm font-black text-slate-400">
          <img src="/logo.svg" alt="" width={18} height={18} className="rounded" />
          tenfor<span className="text-amber-500">today</span>
        </div>
        <p className="max-w-lg text-xs leading-relaxed text-slate-400">
          Ten deals a day. Zero clutter. Ten for today — the community's daily Top 10, reset
          nightly at 12:00 AM Pacific ({RESET_TIMEZONE === 'America/Los_Angeles' ? 'PST/PDT' : RESET_TIMEZONE}). Posts may
          contain affiliate links; posters may earn a commission. Daily deal snapshots courtesy of
          Slickdeals.
        </p>
      </div>
    </footer>
  )
}

function Shell() {
  const [signInOpen, setSignInOpen] = useState(false)
  return (
    <div className="flex min-h-dvh flex-col">
      <Header onSignIn={() => setSignInOpen(true)} />
      <main className="mx-auto w-full max-w-5xl grow px-4 py-6">
        <Routes>
          <Route path="/" element={<Top10Page />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/browse/:category" element={<BrowsePage />} />
          <Route path="/submit" element={<SubmitDealPage />} />
          <Route path="/myposts" element={<MyPostsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Top10Page />} />
        </Routes>
      </main>
      <Footer />
      <Sheet open={signInOpen} onClose={() => setSignInOpen(false)} title={`Welcome to ${SITE_NAME}`}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Vote anonymously — no account needed. Join free to <strong>post deals</strong> with
            your affiliate links.
          </p>
          <AuthForms onDone={() => setSignInOpen(false)} />
        </div>
      </Sheet>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  )
}
