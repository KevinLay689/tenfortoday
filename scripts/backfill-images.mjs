#!/usr/bin/env node
/**
 * One-time backfill: adds imageUrl + listPrice to today's imported posts by
 * re-fetching the Slickdeals feeds and matching on the deterministic doc ids.
 * Uses the service account (admin, bypasses security rules), so existing votes
 * on those posts are preserved.
 *
 * Usage: SA_PATH=./serviceAccountKey.json node scripts/backfill-images.mjs
 */

import { createHash, createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const SA_PATH = process.env.SA_PATH || 'serviceAccountKey.json'
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'top10today-f1418'
const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCag-H8M0jAZa-NjSn4g9sI60Qc9HZPMAM'
const FIRE_URL =
  process.env.SD_FIRE_URL ||
  'https://slickdeals.net/web-api/dxp/content-block/69fa65ef63a48f96f04d4831/6a8f77d65436d4dbba11371d/?src=firedeals-cms&attrsrc=Feed%3AID%3A69fa65ef63a48f96f04d4831%7CFeed%3ABlock%3A6a8f77d65436d4dbba11371d'
const GENERAL_URL =
  process.env.SD_API_URL || 'https://slickdeals.net/web-api/search/deals/?query=&hideExpired=true'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'))
const now = Math.floor(Date.now() / 1000)
const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const header = enc({ alg: 'RS256', typ: 'JWT', kid: sa.private_key_id })
const claims = enc({
  iss: sa.client_email,
  scope: 'https://www.googleapis.com/auth/cloud-platform',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600,
})
const signer = createSign('RSA-SHA256')
signer.update(`${header}.${claims}`)
const jwt = `${header}.${claims}.${signer.sign(sa.private_key).toString('base64url')}`
const { access_token: TOKEN } = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
}).then((r) => r.json())
if (!TOKEN) throw new Error('no token')

const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const dayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

async function feedDeals(url, label) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${label}: ${res.status}`)
  const j = await res.json()
  return j.deals || []
}
const deals = [...(await feedDeals(FIRE_URL, 'fire')), ...(await feedDeals(GENERAL_URL, 'general'))]
const byDocId = new Map()
for (const d of deals) {
  const threadId = String(d.threadId || d.uniqueId || '')
  if (threadId) byDocId.set(`imp_${dayKey}_${threadId}`, d)
}
console.log(`[backfill] feed lookup: ${byDocId.size} deals for ${dayKey}`)

let updated = 0
let skipped = 0
for (const [docId, d] of byDocId) {
  const imageUrl = String(d.dealImageUrl || '')
  const listPrice = String(d.listPriceText || '')
  if (!imageUrl) continue
  const mask = [
    'imageUrl',
    ...(listPrice ? ['listPrice'] : []),
  ].map((f) => `updateMask.fieldPaths=${f}`).join('&')
  const res = await fetch(`${FS}/posts/${docId}?${mask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ fields: { imageUrl: { stringValue: imageUrl }, ...(listPrice ? { listPrice: { stringValue: listPrice } } : {}) } }),
  })
  if (res.status === 200) updated++
  else if (res.status === 404) skipped++ // not imported today
  else console.error(`[backfill] ✖ ${docId}: ${res.status} ${(await res.text()).slice(0, 120)}`)
}
console.log(`[backfill] done: ${updated} updated, ${skipped} not found (imported another day)`)
