# Argus

> **Argus** is a student opportunity platform. It pulls internships, scholarships, competitions and hackathons from **live sources** into one place, ranks them for your profile, and **reminds you before every deadline.**

Most students juggle a dozen siloed platforms and still miss things — and the costliest failure mode isn't a weak profile, it's a **deadline that slipped by**. Argus is a neutral *aggregation + reminder layer* across every category: it surfaces what's relevant to you and pings you in time. We always deep-link out to the original site to apply — we're never the application endpoint.

---

## What it does

| Pillar | How |
| --- | --- |
| **Cross-category feed** | Internships · scholarships · competitions · hackathons, normalised into one `Opportunity` schema. No incumbent does this — each is siloed to one vertical. |
| **Live aggregation** | 9 sources fetched server-side, cached, deduped. Verified live: **213 opportunities** across all categories on first scan. |
| **Eligibility-aware filtering** | Branch, year, CGPA, state, category, gender → opportunities you *can't* apply to are hidden. Missing fields default to *eligible* so noisy data never wrongly hides a match. |
| **Transparent ranking** | A deterministic weighted score (no ML training, no pay-to-rank) with a free **"why this matched you"** explanation on every card. |
| **Deadline nudges** | Reminders at **T-7d / T-3d / T-1d / T-3h** via in-app center, **real browser push (web-push/VAPID)**, email (Resend-ready) and one-tap **Add-to-Calendar (.ics + Google)**. |
| **Distinctive design** | A clean, light "signal" system — an authored cyan-teal palette, a real display typeface, category tiles, deadline-warmed countdowns, per-card match glyphs and a floating tab bar. WCAG-minded, mobile-first. |

---

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

No API keys, no database, no cloud account required — the app aggregates from zero-auth public APIs and persists a cache + a generated VAPID keypair to `.cache/`. On first load the feed performs a live scan (with skeleton loaders); subsequent loads are instant.

---

## Live data sources

All fetched **server-side** (no per-request scraping in the browser), cached for 30 min, deduped, with per-source health surfaced in the UI. We prefer official APIs/JSON, scrape only public pages politely, and always link back.

| Source | Tier | Category | Access |
| --- | --- | --- | --- |
| **Devpost** | green | Hackathons | Public JSON `devpost.com/api/hackathons` |
| **Devfolio** | green | Hackathons | Public JSON `api.devfolio.co` (India-heavy) |
| **Unstop** | amber | All categories | Public JSON (browser UA) — best single India source |
| **Codeforces** | green | Competitions | Official API `codeforces.com/api` |
| **CodeChef** | green | Competitions | Public JSON contests API |
| **Greenhouse ATS** | green | Internships | Official board JSON for ~20 India-hiring companies |
| **Arbeitnow** | green | Internships | Public job-board API (remote/early-career breadth) |
| **Scholarships** | seed | Scholarships | Curated dataset of ~29 real Indian awards (govt + private + study-abroad) — no portal exposes an API, so curation is the backbone |
| **Seed** | seed | Mixed | ~20 curated India-relevant fallbacks so the feed is never empty offline |

> **Avoided on purpose:** LinkedIn / Indeed / Internshala scraping (ToS / legal risk). We deep-link out instead. See `src/lib/sources/*` — each adapter implements the same `SourceAdapter` contract and one failure never sinks the run (`Promise.allSettled`).

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

## Deadline nudges (`src/lib/nudges.ts`, `/api/nudges`)

- Deadline-**relative** schedule (not a fixed weekly blast): **T-14d** (high-effort scholarships/competitions), **T-7d, T-3d, T-1d, T-3h**.
- **Relevance-gated** — only high-relevance matches (score > 0.5 or top-N) with a real deadline.
- **Multi-channel, free-first**: in-app center + **real Web Push** (VAPID, works on localhost — try *Notifications → Send me a test nudge*) + email (set `RESEND_API_KEY`) + one-tap **.ics / Google Calendar** so the student's own calendar is a zero-cost backup.
- **Loss-aversion copy** with social proof: *"Last call — closes in ~3 hours. Don't lose your shot."*
- **Anti-fatigue**: per-channel toggles, quiet hours (default 8am–9pm IST), frequency cap, snooze, weekly digest.

---

## Architecture

```
Browser (Next.js App Router, React 19, Tailwind v4)
  └─ reads /api/feed, /api/nudges, /api/score  ── never scrapes directly
        │
   Route Handlers ── getCorpus() ── 30-min cache (.cache/corpus.json + memory)
        │                              │ stale → revalidate in background
        └─ aggregate() ── Promise.allSettled over 9 SourceAdapters
                              normalize → dedupe → corpus
```

- **Frontend**: Next.js 16 (App Router, RSC), React 19, Tailwind v4, zustand (localStorage) for profile / saved / prefs.
- **Data**: file-cache for a zero-config demo. The `SourceAdapter` + aggregator pattern is production-shaped — swap the cache for Postgres/Prisma and run the aggregator on a cron (below) without touching the UI.
- **No personal data** is stored; we collect zero recruiter data (DPDP-friendly).

### Production deployment (the real shape)

The demo runs everything in-process. For production the research-backed architecture is **scrape-on-cron, frontend-reads-DB**:

- A **GitHub Actions cron** (`.github/workflows/aggregate.yml`, included) runs the aggregator on a schedule and writes to a database; Vercel only reads.
- The **nudge worker** (`/api/nudges`) is hit by a free hourly external trigger (cron-job.org / GitHub Actions) — Vercel Hobby cron is daily-only and can't fire T-3h.
- Optional env (`.env.example`): `INGEST_SECRET`, `CRON_SECRET`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, `RESEND_API_KEY`, `ADZUNA_APP_ID`/`KEY`, `TELEGRAM_BOT_TOKEN`.

---

## Project map

```
src/
  app/
    page.tsx                 landing
    onboarding/              3-question setup + live match preview
    feed/ saved/ notifications/ profile/
    api/                     feed · opportunities · ingest · score · nudges · ics/[id] · push/*
  lib/
    types.ts taxonomy.ts     canonical Opportunity + shared skill vocabulary
    rank.ts eligibility.ts   the transparent ranking engine
    nudges.ts ics.ts         deadline scheduler + calendar export
    feed.ts corpus.ts store.ts  query layer + cache
    sources/                 9 SourceAdapters + aggregator
  components/                brand · feed cards · onboarding · layout
  store/                     zustand: profile · collections · prefs · nudges · theme
```

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
