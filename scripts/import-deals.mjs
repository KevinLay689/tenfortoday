#!/usr/bin/env node
/**
 * TenForToday — daily deal import job.
 *
 * Pulls the current crop of community-vetted deals from Slickdeals' public web
 * JSON API, keeps the strongest by community votes, and posts them to Firestore
 * as "administrator" so the day's board has candidates before real users post.
 *
 * Designed to run from GitHub Actions (cron 00:05 PST daily) or locally:
 *   FB_ADMIN_EMAIL=... FB_ADMIN_PASSWORD=... npm run import-deals
 *
 * Zero dependencies (Node 20+, global fetch). Idempotent: each deal gets a
 * deterministic doc id per day, so re-runs never create duplicates.
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'top10today-f1418'
const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCag-H8M0jAZa-NjSn4g9sI60Qc9HZPMAM'
// Primary source: Slickdeals' Fire Deals ("Most Active Deals") hydration feed —
// the community's hottest deals, with real vote counts. Falls back to the
// general deals API when the fire feed is empty or unreachable.
const SD_FIRE_URL =
  process.env.SD_FIRE_URL ||
  'https://slickdeals.net/web-api/dxp/content-block/69fa65ef63a48f96f04d4831/6a8f77d65436d4dbba11371d/?src=firedeals-cms&attrsrc=Feed%3AID%3A69fa65ef63a48f96f04d4831%7CFeed%3ABlock%3A6a8f77d65436d4dbba11371d'
const SD_FALLBACK_URL =
  process.env.SD_API_URL || 'https://slickdeals.net/web-api/search/deals/?query=&hideExpired=true'
const MAX_POSTS = Number(process.env.MAX_POSTS || 15)
const DRY_RUN = process.env.DRY_RUN === '1'

const EMAIL = process.env.FB_ADMIN_EMAIL
const PASSWORD = process.env.FB_ADMIN_PASSWORD
if (!EMAIL || !PASSWORD) {
  console.error('✖ Set FB_ADMIN_EMAIL and FB_ADMIN_PASSWORD (see README).')
  process.exit(1)
}

const IDENTITY_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts'
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'
const AUTHOR_NAME = 'administrator'

// Ordered keyword rules — first match wins. Keep broad but unambiguous.
const CATEGORY_RULES = [
  ['gaming', ['ps5', 'ps4', 'xbox', 'nintendo', 'switch game', 'switch oled', '(switch', 'switch)', 'playstation', 'steam deck', 'gaming', 'geforce', 'rtx', 'console', 'controller', 'arcade', 'metroid', 'mario']],
  ['tech', ['iphone', 'ipad', 'macbook', 'imac', 'mac mini', 'airpods', 'apple watch', 'applewatch', 'magsafe', 'laptop', 'notebook', 'chromebook', 'tablet', 'galaxy', 'pixel', 'android', 'phone', 'smartphone', 'mini pc', 'ryzen', 'monitor', 'tv"', ' oled', ' qled', 'projector', 'headphones', 'earbuds', 'earphones', 'soundbar', 'speaker', 'ssd', 'hard drive', 'microsd', 'sd card', 'usb', 'power bank', 'charger', 'cable', 'keyboard', 'mouse', 'webcam', 'router', 'wifi', 'camera', 'gopro', 'drone', 'printer', 'smartwatch', 'fitbit', 'garmin', 'cpu', 'processor', 'ram ']],
  ['toys', ['lego', 'toy', 'barbie', 'hot wheels', 'nerf', 'hasbro', 'mattel', 'playmobil', 'puzzle', 'board game', 'card game', 'pokemon', 'plush', 'doll', 'stroller', 'car seat', 'diaper', 'baby', 'crib', 'high chair', 'kids', 'halloween costume', 'inflatable']],
  ['auto', ['tire', 'dash cam', 'jump starter', 'jumper cable', 'car wax', 'floor mat', 'dewalt', 'milwaukee', 'craftsman', 'ryobi', 'socket set', 'wrench', 'tool set', 'power tool', 'power station', 'drill', 'motorcycle', 'truck', 'jeep', 'rv ', 'car ', 'vehicle', 'oil filter', 'engine oil', 'wiper', 'generator', 'snow blower', 'snow thrower', 'leaf blower', 'pressure washer', 'toro', 'egan', 'ego ', 'makita']],
  ['sports', ['bike', 'bicycle', 'helmet', 'yoga', 'dumbbell', 'kettlebell', 'treadmill', 'exercise', 'fitness', 'workout', 'tent', 'camping', 'sleeping bag', 'cooler', 'fishing', 'kayak', 'paddle', 'golf', 'tennis', 'pickleball', 'baseball', 'basketball', 'football', 'soccer', 'running', 'hiking', 'yeti']],
  ['fashion', ['shoe', 'sneaker', 'boot', 'sandal', 'slipper', 'shirt', 'hoodie', 'jacket', 'coat', 'jeans', 'pants', 'shorts', 'dress', 'sock', 'underwear', 'bra', 'nike', 'adidas', 'new balance', 'puma', 'levi', 'carhartt', 'jewelry', 'necklace', 'sunglasses', 'backpack', 'handbag', 'purse', 'wallet', 'belt', 'watch band', 'apparel', 'lacoste', 'quartz watch', "men's watch", "women's watch"]],
  ['beauty', ['skincare', 'serum', 'sunscreen', 'moisturizer', 'shampoo', 'conditioner', 'hair dry', 'hair straight', 'makeup', 'mascara', 'lipstick', 'perfume', 'fragrance', 'cologne', 'razor', 'gillette', 'toothbrush', 'toothpaste', 'vitamin', 'supplement', 'collagen', 'olaplex', 'elizabeth arden']],
  ['grocery', ['k-cup', 'coffee beans', 'ground coffee', 'instant coffee', 'coffee pod', 'whole bean', 'cold brew', 'tea ', 'snack', 'chips', 'soda', 'candy', 'chocolate', 'cereal', 'pasta', 'sauce', 'olive oil', 'seasoning', 'spice', 'dog bed', 'cat bed', 'dog toy', 'cat toy', 'dog treat', 'cat treat', 'pet bed', 'leash', 'pet ', 'dog ', 'puppy', 'cat ', 'kitten', 'litter', 'detergent', 'laundry', 'toilet paper', 'paper towel', 'trash bag', 'dish soap', 'cleaning', 'protein powder', 'protein shake', 'grocery', 'dr pepper', 'pepsi', 'coke']],
  ['home', ['mattress', 'pillow', 'sheet set', 'blanket', 'comforter', 'vacuum', 'dyson', 'air purifier', 'humidifier', 'heater', 'air conditioner', 'furniture', 'chair', 'desk', 'sofa', 'rug', 'lamp', 'curtain', 'kitchen', 'cookware', 'pan', 'knife', 'blender', 'air fryer', 'instant pot', 'coffee maker', 'espresso machine', 'keurig', 'stand mixer', 'grill', 'refrigerator', 'washer', 'dryer', 'mop', 'candle', 'decor', 'organizer', 'storage', 'bed ', 'halloween decor', 'christmas tree', 'lights']],
]

function log(msg) {
  console.log(`[import] ${msg}`)
}

function todayKeyLA() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

async function jsonPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const err = new Error(json?.error?.message || `${res.status} ${text.slice(0, 200)}`)
    err.code = json?.error?.message || ''
    throw err
  }
  return json
}

/** Sign in as the administrator, creating the account on the very first run. */
async function ensureAdminToken() {
  try {
    const r = await jsonPost(`${IDENTITY_BASE}:signInWithPassword?key=${API_KEY}`, {
      email: EMAIL,
      password: PASSWORD,
      returnSecureToken: true,
    })
    log(`Signed in as ${EMAIL}`)
    return r
  } catch (err) {
    if (String(err.code).includes('EMAIL_NOT_FOUND') || String(err.code).includes('INVALID_LOGIN_CREDENTIALS')) {
      log('Admin account not found — creating it now (first run).')
      return jsonPost(`${IDENTITY_BASE}:signUp?key=${API_KEY}`, {
        email: EMAIL,
        password: PASSWORD,
        returnSecureToken: true,
      })
    }
    if (String(err.code).includes('CONFIGURATION_NOT_FOUND') || String(err.code).includes('OPERATION_NOT_ALLOWED')) {
      throw new Error(
        'Email/Password sign-in is not enabled on the Firebase project. Firebase console → Authentication → Sign-in method → Email/Password → Enable, then re-run.',
      )
    }
    throw err
  }
}

function guessCategory(text) {
  const t = ` ${text.toLowerCase()} `
  for (const [cat, words] of CATEGORY_RULES) {
    for (const w of words) {
      if (t.includes(w)) return cat
    }
  }
  return 'other'
}

function cleanTitle(rawTitle, finalPrice) {
  // Titles often start with the price ("$47.50: Lacoste ...") — lift it out.
  const m = rawTitle.match(/^\$\s?[\d,]+(?:\.\d{2})?\s*[:|–-]\s*(.+)$/)
  const title = m ? m[1].trim() : rawTitle.trim()
  return title.slice(0, 140)
}

function mapDeal(d) {
  const title = cleanTitle(String(d.dealTitle || ''), d.finalPriceText)
  const price = String(d.finalPriceText || '').slice(0, 40)
  const url = d.dealThreadUrl
    ? `https://slickdeals.net${d.dealThreadUrl}`
    : String(d.dealShareUrl || '')
  if (title.length < 4 || !url || d.isExpired) return null
  return {
    title,
    url,
    price: price === '$0' ? 'Free' : price,
    listPrice: String(d.listPriceText || '').slice(0, 40),
    imageUrl: String(d.dealImageUrl || '').slice(0, 2000),
    merchant: String(d.storeName || 'Slickdeals').slice(0, 60),
    category: guessCategory(`${title} ${d.storeName || ''}`),
    description: String(d.dealAdditionalInfo || '').slice(0, 500),
    votes: Number(d.socialVoteCount) || 0,
    threadId: String(d.threadId || d.uniqueId || title),
    postedIso: d.threadIsoDatetime || null,
  }
}

async function fetchJsonDeals(url, label) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${label} returned ${res.status}`)
  const json = await res.json()
  const deals = (json.deals || []).map(mapDeal).filter(Boolean)
  log(`Fetched ${deals.length} live deals from ${label}`)
  return deals
}

async function fetchDeals() {
  let deals = []
  try {
    deals = await fetchJsonDeals(SD_FIRE_URL, 'Slickdeals Fire Deals')
  } catch (err) {
    log(`Fire Deals fetch failed (${err.message.slice(0, 120)}) — falling back to the general feed.`)
  }
  if (deals.length < 5) {
    try {
      deals = deals.concat(await fetchJsonDeals(SD_FALLBACK_URL, 'the general deals feed'))
    } catch (err) {
      if (deals.length === 0) throw err
      log(`General feed also failed (${err.message.slice(0, 120)}); continuing with fire deals only.`)
    }
  }
  // Dedupe by thread (fire + general feeds can overlap), then community-vetted
  // first: most votes, then freshest.
  const seen = new Set()
  deals = deals.filter((d) => (seen.has(d.threadId) ? false : (seen.add(d.threadId), true)))
  deals.sort((a, b) => b.votes - a.votes || (b.postedIso || '').localeCompare(a.postedIso || ''))
  return deals
}

function toRestFields(post, adminUid, dayKey, nowIso) {
  const s = (v) => ({ stringValue: v })
  const i = (n) => ({ integerValue: String(n) })
  return {
    fields: {
      title: s(post.title),
      url: s(post.url),
      category: s(post.category),
      price: s(post.price),
      listPrice: s(post.listPrice || ''),
      imageUrl: s(post.imageUrl || ''),
      merchant: s(post.merchant),
      description: s(post.description || ''),
      imageUrl: s(''),
      dayKey: s(dayKey),
      createdAt: { timestampValue: nowIso },
      authorUid: s(adminUid),
      authorName: s(AUTHOR_NAME),
      source: s('import'),
      upvotes: i(0),
      downvotes: i(0),
      score: i(0),
      voteCount: i(0),
    },
  }
}

async function createPost(idToken, docId, fields) {
  const res = await fetch(`${FS_BASE}/posts?documentId=${encodeURIComponent(docId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(fields),
  })
  if (res.ok) return 'created'
  const text = await res.text()
  if (res.status === 409 || text.includes('ALREADY_EXISTS')) return 'exists'
  throw new Error(`Firestore write failed (${res.status}): ${text.slice(0, 300)}`)
}

async function main() {
  const dayKey = todayKeyLA()
  log(`Daily import for ${dayKey}${DRY_RUN ? ' (dry run)' : ''}`)

  const admin = await ensureAdminToken()
  const adminUid = admin.localId
  if (!adminUid) throw new Error('Auth response missing localId (uid).')

  const deals = (await fetchDeals()).slice(0, MAX_POSTS)
  if (deals.length === 0) {
    log('No suitable deals found in the feed — nothing to post today.')
    return
  }

  let created = 0
  let skipped = 0
  let failed = 0
  for (const deal of deals) {
    const docId = `imp_${dayKey}_${deal.threadId}`
    const fields = toRestFields(deal, adminUid, dayKey, new Date().toISOString())
    if (DRY_RUN) {
      log(`DRY ${deal.title} → ${deal.category} (${deal.merchant}) ${deal.price}`)
      created++
      continue
    }
    try {
      const outcome = await createPost(admin.idToken, docId, fields)
      if (outcome === 'created') {
        created++
        log(`✓ ${deal.title}`)
      } else {
        skipped++
      }
    } catch (err) {
      failed++
      console.error(`[import]   ✖ "${deal.title.slice(0, 60)}": ${err.message.slice(0, 160)}`)
    }
  }
  log(`Done: ${created} posted, ${skipped} already on today's board, ${failed} failed.`)
  if (created === 0 && failed > 0 && skipped === 0) process.exit(1)
}

main().catch((err) => {
  console.error(`[import] ✖ ${err.message}`)
  process.exit(1)
})
