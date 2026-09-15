import type { Category } from './models'

export interface CategoryDef {
  id: Category
  label: string
  emoji: string
}

/** Exactly ten categories — the whole browsing model of the site. */
export const CATEGORIES: CategoryDef[] = [
  { id: 'tech', label: 'Tech & Electronics', emoji: '💻' },
  { id: 'home', label: 'Home & Kitchen', emoji: '🏠' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'fashion', label: 'Fashion', emoji: '👕' },
  { id: 'beauty', label: 'Health & Beauty', emoji: '💅' },
  { id: 'sports', label: 'Sports & Outdoors', emoji: '🏀' },
  { id: 'toys', label: 'Toys, Kids & Baby', emoji: '🧸' },
  { id: 'auto', label: 'Auto & Tools', emoji: '🔧' },
  { id: 'grocery', label: 'Grocery & Pets', emoji: '🛒' },
  { id: 'other', label: 'Everything Else', emoji: '✨' },
]

export const CATEGORY_LABELS: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
) as Record<Category, string>

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)

/** Emoji used as the visual stand-in when a deal has no image. */
export const CATEGORY_EMOJI: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.emoji]),
) as Record<Category, string>

export const SITE_NAME = 'TenForToday'
export const SITE_DOMAIN = 'tenfortoday.com'
/** Where the daily reset clock lives. */
export const RESET_TIMEZONE = 'America/Los_Angeles'
