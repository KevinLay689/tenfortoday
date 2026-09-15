import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../lib/constants'
import type { Category } from '../lib/models'
import { createPost } from '../lib/queries'
import { friendlyAuthError } from '../lib/authErrors'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AuthForms } from '../components/AuthForms'
import { Sheet } from '../components/Sheet'

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function SubmitDealPage() {
  const { user, isAnonymous } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)

  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState<Category>('tech')
  const [price, setPrice] = useState('')
  const [merchant, setMerchant] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const canPost = user && !isAnonymous

  const input =
    'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'

  // Auto-fill merchant from the URL until the user edits it.
  const [merchantTouched, setMerchantTouched] = useState(false)
  const effectiveMerchant = merchantTouched ? merchant : domainOf(url)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !user) return
    let parsed: URL
    try {
      parsed = new URL(url.trim())
      if (!/^https?:$/.test(parsed.protocol)) throw new Error('protocol')
    } catch {
      toast('Please paste a full deal link starting with http(s)://', 'error')
      return
    }
    if (title.trim().length < 8) {
      toast('Give the deal a descriptive title (8+ characters).', 'error')
      return
    }
    setBusy(true)
    try {
      await createPost(user, {
        title,
        url: parsed.toString(),
        category,
        price,
        merchant: effectiveMerchant,
        description,
      })
      toast('Posted! Rally 5 votes to make today’s Top 10. 🚀', 'success')
      void navigate('/myposts')
    } catch (err) {
      toast(friendlyAuthError(err), 'error')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">
          Post a deal
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Share a great deal — paste <strong>your affiliate link</strong> to earn commission on
          clicks. Deals need 5 community votes to enter today&apos;s Top 10.
        </p>
      </div>

      {!canPost && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Anyone can <strong>vote</strong> anonymously, but you need a free account to{' '}
          <strong>post</strong>.{' '}
          <button
            type="button"
            className="font-bold underline"
            onClick={() => setSheetOpen(true)}
          >
            Sign in or join
          </button>{' '}
          to continue.
        </div>
      )}

      <form
        onSubmit={submit}
        className={
          'flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 ' +
          (canPost ? '' : 'pointer-events-none opacity-50 select-none')
        }
        aria-disabled={!canPost}
      >
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Deal link (your affiliate URL) *
          <input
            className={input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://amzn.to/your-affiliate-link"
            type="url"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Title *
          <input
            className={input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "Anker 737 Power Bank 24000mAh — 42% off at Amazon"'
            maxLength={140}
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Price
            <input
              className={input}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="$29.99"
              maxLength={40}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Merchant
            <input
              className={input}
              value={effectiveMerchant}
              onChange={(e) => {
                setMerchantTouched(true)
                setMerchant(e.target.value)
              }}
              placeholder="Amazon"
              maxLength={60}
            />
          </label>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Category *
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={
                  'rounded-full px-3 py-1.5 text-xs font-bold transition ' +
                  (category === c.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')
                }
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Why is it a great deal? (optional)
          <textarea
            className={input + ' min-h-20 resize-y'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="Short pitch: what it is, why the price is good, any coupons needed…"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Posting…' : 'Post deal 🚀'}
        </button>
        <p className="text-center text-[11px] text-slate-400">
          By posting you confirm the link is safe and relevant. Posts may contain affiliate links;
          posters may earn a commission.
        </p>
      </form>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Welcome to TenForToday">
        <AuthForms onDone={() => setSheetOpen(false)} />
      </Sheet>
    </div>
  )
}
