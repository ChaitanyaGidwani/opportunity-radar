# Argus

> **Argus** is a student opportunity platform. It pulls internships, scholarships, competitions and hackathons from **live sources** into one place, ranks them for your profile, and **reminds you before every deadline.**

Most students juggle a dozen siloed platforms and still miss things — and the costliest failure mode isn't a weak profile, it's a **deadline that slipped by**. Argus is a neutral *aggregation + reminder layer* across every category: it surfaces what's relevant to you and pings you in time. We always deep-link out to the original site to apply — we're never the application endpoint.

---

## What it does

| Pillar | How |
| --- | --- |
| **Cross-category feed** | Internships · scholarships · competitions · hackathons, normalised into one `Opportunity` schema. No incumbent does this — each is siloed to one vertical. |
| **Live aggregation** | 10 sources fetched server-side, cached, deduped. Verified live: **213+ opportunities** across all categories on first scan. |
| **Eligibility-aware filtering** | Branch, year, CGPA, state, category, gender → opportunities you *can't* apply to are hidden. Missing fields default to *eligible* so noisy data never wrongly hides a match. |
| **Transparent ranking** | A deterministic weighted score (no ML training, no pay-to-rank) with a free **"why this matched you"** explanation on every card. |
| **Deadline nudges** | Reminders at **T-7d / T-3d / T-1d / T-3h** via in-app center, **real browser push (web-push/VAPID)**, **email (via Resend)** and one-tap **Add-to-Calendar (.ics + Google)**. |
| **Distinctive design** | A clean, light "signal" system — an authored cyan-teal palette, a real display typeface, category tiles, deadline-warmed countdowns, per-card match glyphs and a floating tab bar. WCAG-minded, mobile-first. |
| **Persistent User Profiles**| Seamlessly syncs your skills, preferences, and saved opportunities across devices using **Firebase Firestore**. |

---

## Quick start

To run Argus locally, you will need a `.env.local` file with your API keys.

1. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_firebase_auth_domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_firebase_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_firebase_storage_bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"

# For email notification testing
RESEND_API_KEY="your_resend_api_key"
```

2. Install dependencies and start the server:
```bash
npm install
npm run dev
# open http://localhost:3000
```

On first load, the feed performs a live scan across all 10 sources (with skeleton loaders); subsequent loads are extremely fast due to local `.cache/` data.

---

## Live data sources

All fetched **server-side** (no per-request scraping in the browser), cached for 30 min, deduped, with per-source health surfaced in the UI. We prefer official APIs/JSON, scrape only public pages politely, and always link back.

| Source | Tier | Category | Access |
| --- | --- | --- | --- |
| **Devpost** | green | Hackathons | Public JSON `devpost.com/api/hackathons` |
| **Devfolio** | green | Hackathons | Public JSON `api.devfolio.co` (India-heavy) |
| **ETHGlobal** | green | Hackathons | HTML Scraper (via `cheerio`) extracting events directly from `ethglobal.com/events` |
| **Unstop** | amber | All categories | Public JSON (browser UA) — best single India source |
| **Codeforces** | green | Competitions | Official API `codeforces.com/api` |
| **CodeChef** | green | Competitions | Public JSON contests API |
| **Greenhouse ATS** | green | Internships | Official board JSON for ~20 India-hiring companies |
| **Arbeitnow** | green | Internships | Public job-board API (remote/early-career breadth) |
| **Scholarships** | seed | Scholarships | Curated dataset of ~29 real Indian awards (govt + private + study-abroad) — no portal exposes an API, so curation is the backbone |
| **Seed** | seed | Mixed | ~20 curated India-relevant fallbacks so the feed is never empty offline |

> **Avoided on purpose:** LinkedIn / Indeed / Internshala scraping (ToS / legal risk) and Luma / DoraHacks (strict anti-bot WAFs/hidden search APIs). We deep-link out instead. See `src/lib/sources/*` — each adapter implements the same `SourceAdapter` contract and one failure never sinks the run (`Promise.allSettled`).

---

## How ranking works (`src/lib/rank.ts`)

A transparent two-stage recommender that runs as a pure function in milliseconds:

1. **Hard eligibility filter** — drop closed deadlines and anything the student is provably ineligible for. *Only* high-confidence fields filter; missing = eligible.
2. **Weighted soft score** (semantic embeddings off by default):

   ```
   skill 0.40 · interest 0.25 · urgency 0.15 · recency 0.10 · popularity 0.05 · location 0.05
   ```

   - **skill** — overlap of your skills with the opportunity's tags over a shared ~150-term controlled vocabulary (with a synonym map: `ml → machine-learning`, `js → javascript`, …).
   - **urgency** — peaks ~8 days out (the sweet spot to act), penalises <2 days and far-off items.
   - **recency** — `exp(-ageDays/14)`. **popularity** — `log1p` of applicants. **location** — remote / same-city / relocate.
   - **Cold-start**: signals a new profile can't produce are dropped and the weights renormalise.
   - **Explainability is free** — the top contributing signals are templated into chips like *"Matches 2 of your skills: Machine Learning, Python · Closes in 5 days"*. Open any card → **"How this was scored"** shows the full weighted breakdown.

Default feed sort is **Closing soonest** (the deadline value prop); also Best match and Newest.

---

## Deadline nudges (`src/lib/nudges.ts`, `/api/test-nudge`)

- Deadline-**relative** schedule (not a fixed weekly blast): **T-14d** (high-effort scholarships/competitions), **T-7d, T-3d, T-1d, T-3h**.
- **Relevance-gated** — only high-relevance matches (score > 0.5 or top-N) with a real deadline.
- **Multi-channel**: in-app center + **real Web Push** (VAPID) + **Email Notifications** (via Resend) + one-tap **.ics / Google Calendar**.
- **Anti-fatigue**: per-channel toggles, quiet hours (default 8am–9pm IST), frequency cap, snooze, weekly digest.

---

## Architecture

```
Browser (Next.js App Router, React 19, Tailwind v4)
  ├─ User Profile & Settings ── Firebase Firestore
  └─ reads /api/feed, /api/nudges, /api/score
        │
   Route Handlers ── getCorpus() ── 30-min cache (.cache/corpus.json + memory)
        │
        └─ aggregate() ── Promise.allSettled over 10 SourceAdapters
                              normalize → dedupe → corpus
```

- **Frontend**: Next.js 16 (App Router, RSC), React 19, Tailwind v4.
- **Backend Storage**: Firebase Firestore for persistent user profiles and preferences.
- **Data Pipelines**: File-cache for zero-config demo aggregation. The `SourceAdapter` + aggregator pattern is production-shaped — swap the cache for Postgres/Prisma and run the aggregator on a cron without touching the UI.
- **Email Digest**: Resend SDK integrated via Next.js Serverless API routes.

---

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

---

## Compliance

Argus is a discovery & notification layer. We aggregate public APIs, RSS and curated datasets; honour `robots.txt`, source ToS and removal requests; store facts not verbatim republication; and **always deep-link out to the original source to apply.**

---

*Built with a live multi-source aggregation pipeline, a transparent ranking engine, and a multi-channel deadline-reminder system.*
