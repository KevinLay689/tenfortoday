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
import { SITE_NAME } from './lib/constants'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  'whitespace-nowrap border-b-[3px] px-3 py-2.5 text-sm font-bold transition ' +
  (isActive
    ? 'border-[#c62828] text-[#c62828]'
    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-[#0b4dc0] dark:text-slate-300 dark:hover:text-blue-400')

function Header({ onSignIn }: { onSignIn: () => void }) {
  const { user, isAnonymous } = useAuth()
  const navigate = useNavigate()
  const member = user && !isAnonymous

  return (
    <header className="sticky top-0 z-30 border-b-2 border-[#0b1f3f] bg-white dark:border-slate-700 dark:bg-slate-950">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4">
        <NavLink to="/" className="flex shrink-0 items-center gap-1.5 py-2" aria-label={SITE_NAME}>
          <img src="/logo.svg" alt="" width={28} height={28} className="rounded-[3px]" />
          <span className="text-lg font-bold tracking-tight text-[#0b1f3f] dark:text-white">
            TenFor<span className="text-[#c62828]">Today</span>
          </span>
        </NavLink>

        <nav className="no-scrollbar -mb-0.5 flex grow items-center gap-0.5 overflow-x-auto" aria-label="Tabs">
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
            className="rounded-[4px] bg-[#0b4dc0] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#0a43a8] sm:text-sm"
          >
            + Post a Deal
          </button>
          {member ? (
            <NavLink
              to="/settings"
              className="hidden max-w-32 truncate py-2 text-xs font-bold text-[#0b4dc0] hover:underline sm:block dark:text-blue-400"
              title={user.email ?? undefined}
            >
              {user.displayName || user.email?.split('@')[0] || 'member'}
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="hidden py-2 text-xs font-bold text-[#0b4dc0] hover:underline sm:block dark:text-blue-400"
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
    <footer className="mt-10 border-t border-[#d9d9d9] bg-white py-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1.5 px-4 text-center">
        <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
          TenFor<span className="text-[#c62828]">Today</span>
        </div>
        <p className="max-w-xl text-xs leading-relaxed text-slate-400">
          Ten deals a day, ranked by your votes. The board resets nightly at 12:00 AM Pacific.
          Posts may contain affiliate links; posters may earn a commission. Daily deal snapshots
          courtesy of Slickdeals.
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
