# TenForToday 🏆

**Ten deals a day. Zero clutter.** The 10 best deals of the day, ranked by community votes.
Vote anonymously (no account needed), post deals with your own affiliate links (free account
required), and watch the board reset every midnight PST. Live at [tenfortoday.com](https://tenfortoday.com).

A stripped-down, single-purpose take on Slickdeals: one leaderboard, ten categories, no noise.

Mobile-first web app built with **React + Vite + TypeScript + Tailwind** on **Firebase**
(Auth, Firestore, Hosting). Daily deal snapshots are imported from Slickdeals by a scheduled
GitHub Action.

---

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
```

The app talks to the real Firebase project (`top10today-f1418`). Until the project's one-time
setup (below) is done, the board shows the "Waiting for today's votes" state.

## One-time Firebase setup (≈5 minutes, console only)

The Firebase project ships brand-new, so three console toggles are needed once. Everything
else in this repo is already wired for them.

1. **Create the Firestore database** — Firebase console →
   [Firestore Database](https://console.firebase.google.com/project/top10today-f1418/firestore)
   → **Create database** → *Production mode* → location `nam5 (United States)`.
2. **Enable Email/Password sign-in** — console →
   [Authentication](https://console.firebase.google.com/project/top10today-f1418/authentication)
   → Sign-in method → **Email/Password → Enable** (required for member registration and the
   daily import job's `administrator` account).
3. **Enable Anonymous sign-in** — same page → **Anonymous → Enable** (required for
   anonymous voting).

## Deploy

```bash
npm install -g firebase-tools   # once
firebase login                  # once per machine (interactive Google sign-in)
firebase deploy                 # hosting + firestore rules + indexes
```

The site goes live on Firebase Hosting (`https://top10today-f1418.web.app` — the Firebase
project keeps its original id). Security rules and composite indexes deploy together — first
index build takes a few minutes.

## Attach tenfortoday.com (Cloudflare DNS)

1. Firebase console → Hosting → **Add custom domain** → enter `tenfortoday.com` → confirm
   adding `www` as a redirect to the apex.
2. When Firebase shows the DNS records, add them in the Cloudflare dashboard (tenfortoday.com
   → DNS → Records), **DNS-only / gray cloud** — Firebase's managed certificate can't be
   issued through the Cloudflare proxy. The records Firebase requests are normally:
   | Type | Name | Value |
   |------|------|-------|
   | A | `@` | `199.36.158.100` |
   | CNAME | `www` | `ghs.googlehosted.com` |
   | TXT | `_acme-challenge` (only if shown) | the unique value the console displays |
3. Back in Firebase, wait for "Pending" → "Connected" (usually minutes once DNS propagates);
   HTTPS provisions automatically.

If Cloudflare auto-imported placeholder records for `@`/`www`, delete those first so only the
Firebase records remain.

## How it works

- **Top 10** — one query per view: today's deals (`dayKey` = today in Pacific time) sorted by
  vote score; deals with **5+ votes** take the board, best first. Below it, "Today's deals"
  lists the rest of today's candidates so there's always something to vote on.
- **Midnight PST reset** — nothing to cron: the board *is* "posts created today", so the date
  rollover clears it automatically. An empty board shows *Waiting for today's votes*.
- **Anonymous voting** — first tap silently creates a Firebase anonymous session that persists
  in the browser, so one browser = one vote per deal. Up/down arrows toggle or switch votes in
  a Firestore transaction that moves the counters atomically. Backend updates instantly; the
  ranking refreshes on tab change or reload (deliberately not live).
- **Posting** — email/password registration required. Posts carry the poster's **affiliate
  link** as-is (that's how posters earn), a price, merchant, and one of ten categories.
- **Categories (exactly 10)** — Tech, Home & Kitchen, Gaming, Fashion, Health & Beauty,
  Sports & Outdoors, Toys/Kids/Baby, Auto & Tools, Grocery & Pets, Everything Else.
- **Data model** — `posts/{id}` (denormalized vote counters) and `votes/{postId}__{voterId}`
  (deterministic id enforces one vote per voter per deal). Firestore rules lock counter
  updates to ±1-per-vote and posting to non-anonymous accounts.

## Daily Slickdeals import

[`scripts/import-deals.mjs`](scripts/import-deals.mjs) signs in as `administrator`, pulls
Slickdeals' public deals JSON API, keeps the top 15 by community votes, auto-categorizes them
(keyword rules), and posts them with a "via Slickdeals" tag. Deterministic doc ids
(`imp_{day}_{threadId}`) make re-runs idempotent.

It runs daily at **00:05 PST** via [`.github/workflows/daily-deals.yml`](.github/workflows/daily-deals.yml)
(requires the repo secrets `FB_ADMIN_EMAIL` / `FB_ADMIN_PASSWORD` — already configured). You can
also trigger it manually: repo → **Actions → Daily deals import → Run workflow**, or locally:

```bash
FB_ADMIN_EMAIL=... FB_ADMIN_PASSWORD=... npm run import-deals
```

On the very first run the script **creates** the administrator account automatically. To
rotate the password later: change it in Firebase console → Authentication → Users, update the
two repo secrets, done. A red Actions run almost always means one of the three console setup
steps above is still pending — the log says exactly which.

## Project layout

```
firebase.json, .firebaserc     hosting + deploy config (rules & indexes included)
firestore.rules|indexes.json   security rules & composite indexes
src/lib/                       firebase init, queries, voting transaction, PST day logic
src/context/                   auth (anonymous voting + member sessions), toasts
src/components/                deal cards (vote column), tabs, auth forms, empty states
src/pages/                     Top10, Browse, SubmitDeal, MyPosts, Settings
scripts/import-deals.mjs       daily Slickdeals import (zero dependencies)
.github/workflows/             daily cron job
```
