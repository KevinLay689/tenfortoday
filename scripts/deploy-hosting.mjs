#!/usr/bin/env node
/**
 * TenForToday — deploy ./dist to Firebase Hosting via the REST API.
 *
 * Lets you deploy with a service account key instead of an interactive
 * `firebase login`. Zero dependencies (Node 20+, global fetch).
 *
 * Usage:
 *   npm run build
 *   SA_PATH=./serviceAccountKey.json node scripts/deploy-hosting.mjs [distDir] [siteId]
 *
 * Hosting config (rewrites + headers) is read from firebase.json.
 */

import { createHash, createSign } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, relative, sep } from 'node:path'

const SA_PATH = process.env.SA_PATH || 'serviceAccountKey.json'
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'top10today-f1418'
const DIST_DIR = process.argv[2] || 'dist'
const SITE_ID = process.argv[3] || PROJECT_ID
const API = 'https://firebasehosting.googleapis.com/v1beta1'

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'))
const fbjson = JSON.parse(readFileSync('firebase.json', 'utf8'))
const hosting = Array.isArray(fbjson.hosting) ? fbjson.hosting[0] : fbjson.hosting

function mintToken() {
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
  return fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  }).then((r) => r.json())
}

function walk(dir, base = dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full, base))
    else out.push(relative(base, full).split(sep).join('/'))
  }
  return out
}

const log = (m) => console.log(`[hosting] ${m}`)

async function api(token, method, url, body, extraHeaders = {}) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...extraHeaders },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${url} → ${res.status}: ${text.slice(0, 300)}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : {}
}

async function main() {
  log(`Deploying ${DIST_DIR}/ → site ${SITE_ID}`)
  const { access_token: token } = await mintToken()
  if (!token) throw new Error('Could not mint an OAuth token from the service account.')

  // 1. Create a version carrying the hosting config (rewrites + headers).
  // (Version/file routes are site-scoped; glob/header shapes follow the API:
  //  rewrites use glob/path, headers use glob + a string map — the
  //  "**/*.@(js|css|woff2)" style glob from firebase.json is expanded per extension.)
  const versionConfig = {}
  if (hosting.rewrites?.length) {
    versionConfig.rewrites = hosting.rewrites.map((r) => ({ glob: r.source, path: r.destination }))
  }
  if (hosting.headers?.length) {
    versionConfig.headers = hosting.headers.flatMap((h) => {
      const map = Object.fromEntries(h.headers.map((x) => [x.key, x.value]))
      const globMatch = h.source.match(/\*\*\*\/\*\.@\((.+)\)/) || h.source.match(/\*\*@?\((.+)\)/)
      if (globMatch) {
        return globMatch[1]
          .split('|')
          .map((ext) => ({ glob: `**/*.${ext}`, headers: map }))
      }
      return [{ glob: h.source, headers: map }]
    })
  }
  const version = await api(
    token,
    'POST',
    `${API}/sites/${SITE_ID}/versions`,
    JSON.stringify({ status: 'CREATED', config: versionConfig }),
    { 'Content-Type': 'application/json' },
  )
  log(`Version created: ${version.name}`)

  // 2. Populate the version with the file list (path + sha256 of gzipped bytes),
  //    then upload only the hashes the backend says it is missing.
  const files = walk(DIST_DIR)
  const manifest = files.map((rel) => {
    const raw = readFileSync(join(DIST_DIR, rel))
    const gz = raw.length > 0 ? gzipSync(raw, { level: 9 }) : raw
    const hash = createHash('sha256').update(gz).digest('hex')
    return { rel, raw, gz, hash }
  })
  const populate = await api(
    token,
    'POST',
    `${API}/${version.name}:populateFiles`,
    JSON.stringify({ files: Object.fromEntries(manifest.map((f) => ['/' + f.rel, f.hash])) }),
    { 'Content-Type': 'application/json' },
  )
  const byHash = new Map(manifest.map((f) => [f.hash, f]))
  log(`Populated ${manifest.length} files; ${populate.uploadRequiredHashes?.length ?? 0} need upload`)
  for (const hash of populate.uploadRequiredHashes ?? []) {
    const f = byHash.get(hash)
    if (!f) throw new Error(`Server asked for unknown hash ${hash}`)
    await api(token, 'POST', `${populate.uploadUrl}/${hash}`, f.gz, {
      'Content-Type': 'application/octet-stream',
    })
    log(`↑ ${f.rel} (${f.gz.length} bytes gzipped)`)
  }

  // 3. Finalize the version, then cut a release to the live channel.
  await api(
    token,
    'PATCH',
    `${API}/${version.name}?updateMask=status`,
    JSON.stringify({ status: 'FINALIZED' }),
    { 'Content-Type': 'application/json' },
  )
  const release = await api(
    token,
    'POST',
    `${API}/projects/-/sites/${SITE_ID}/channels/live/releases?versionName=${encodeURIComponent(version.name)}`,
    JSON.stringify({ message: 'TenForToday deploy' }),
    { 'Content-Type': 'application/json' },
  )
  log(`Release live: ${release.name}`)
  log(`🌍 https://${SITE_ID}.web.app`)
}

main().catch((err) => {
  console.error(`[hosting] ✖ ${err.message}`)
  process.exit(1)
})
