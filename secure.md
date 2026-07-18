# Security Review — opportunity-radar

Date: 2026-07-18 · Commit: `77ec2f9` · Reviewed by: Claude (manual source review — no dynamic/pen-testing performed)

Scope: full `src/` tree, `next.config.ts`, `.github/workflows/`, `package.json` dependency tree, and observed production behavior (Vercel runtime logs). This was a static, read-only review; nothing in the app was exploited as part of the review pass.

> **Remediation status (2026-07-18):** Findings #1–#9 and #11 have been fixed in code (see "Fix applied" notes under each and the "Remediation summary" section at the bottom). #10 is upstream (Next.js) and #12 was already good. **One manual step remains and is required: deploy the new `firestore.rules` (finding #2).** All code changes pass `tsc --noEmit` and `eslint` clean.

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Unauthenticated push broadcast + unvalidated click-through URL | **Critical** | ✅ Fixed |
| 2 | Firestore security rules not in repo / unverifiable | **Critical** | ⚠️ Rules added — **must deploy** |
| 3 | Ingest-secret bypass via `/api/opportunities?force=1` | High | ✅ Fixed |
| 4 | Unauthenticated, unthrottled AI endpoints (cost/quota abuse) | High | ✅ Fixed (rate-limited) |
| 5 | Unauthenticated email relay via `/api/test-nudge` | High | ✅ Fixed |
| 6 | reCAPTCHA token collected but never verified server-side | Medium | ✅ Fixed |
| 7 | Untrusted third-party URLs rendered as clickable links with no scheme check | Medium | ✅ Fixed |
| 8 | No security headers configured (CSP, X-Frame-Options, etc.) | Medium | ✅ Fixed |
| 9 | `/api/push/subscribe` accepts/deletes any subscription with no ownership check | Low | ✅ Fixed (shape validated) |
| 10 | `postcss` transitive advisory via Next.js (GHSA-qx2v-qp2m-jg93) | Low | ⏳ Upstream — track |
| 11 | `pdf-parse` is an old, lightly-maintained PDF parser fed user uploads | Low | ✅ Mitigated (size cap) |
| 12 | Secrets hygiene — no leaked keys, `.env*` correctly gitignored | Informational | ✅ Good (no change) |

---

## 1. Unauthenticated push broadcast + unvalidated click-through URL — Critical

**Where:** `src/app/api/push/send/route.ts`, `public/sw.js`

`POST /api/push/send` has no authentication or authorization check at all. It accepts `{ title, body, url, tag }` straight from the request body and calls `broadcast()`, which pushes that payload to **every** stored subscription (`src/lib/push.ts`). The service worker then shows the notification and, on click, does:

```js
const url = (event.notification.data && event.notification.data.url) || "/notifications";
...
client.navigate(url); // or self.clients.openWindow(url)
```

with no check that `url` is same-origin or even `http(s)`.

**Impact:** Anyone on the internet can `curl` this endpoint to push an arbitrary title/body/link to every real subscriber, impersonating the app ("⏰ Deadline approaching" is the default title already). Combined with the unvalidated `url`, this is a ready-made phishing/malware-distribution channel that rides on the app's own push subscriptions and installed-PWA trust.

**Recommendation:**
- Require server-side auth on this route (e.g. the same `Authorization: Bearer <secret>` pattern already used for `/api/ingest`, or restrict it to be called only from `/api/nudges`'s own server logic, never from a public route).
- Validate `url` is a relative path or same-origin absolute URL before including it in the payload.
- Validate/allowlist `title`/`body` length and content if this is ever meant to carry user-influenced text.

## 2. Firestore security rules not in repo / unverifiable — Critical

**Where:** Firebase project config (not in this repository); consumed by `src/lib/firebase.ts`, `src/store/profile.ts`, `src/lib/firestore-sync.ts`

All authorization for user data — profile (`users/{uid}`), saved/applied opportunities and notification prefs (`users/{uid}/private/{collections,prefs}`) — is enforced entirely by Firestore Security Rules, which aren't version-controlled in this project (`firestore.rules` doesn't exist here, and there's no Firebase CLI config either). I have no way to confirm from the repo that rules correctly restrict each document to `request.auth.uid == uid`.

This matters more now than before: anonymous auth was just enabled so *every visitor*, not just people who sign up, gets a uid that can write to Firestore. If the rules are still in Firebase's default "test mode" (`allow read, write: if true;`, which Firebase ships by default and expires but is easy to accidentally leave/renew) or simply missing a uid check, **any client can read or overwrite any other user's profile, resume-derived data, saved items, and prefs** — including real signed-in users' data, not just anonymous sessions.

**Recommendation:** Add `firestore.rules` to the repo and deploy it (`firebase deploy --only firestore:rules`) with, at minimum:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /private/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```
Then verify in the Firebase Console → Firestore → Rules tab that this is actually what's deployed, and that "test mode" isn't still active.

## 3. Ingest-secret bypass via `/api/opportunities?force=1` — High

**Where:** `src/app/api/opportunities/route.ts`, `src/app/api/ingest/route.ts`, `src/lib/corpus.ts`

`/api/ingest` is gated by `INGEST_SECRET` (confirmed configured as a GitHub Actions secret in `.github/workflows/ingest-cron.yml`). But `GET /api/opportunities?force=1` calls the exact same underlying function — `getCorpus({ force: true })` → `refreshCorpus(() => aggregate())` — with **no auth check whatsoever**. Anyone can hit this public, unauthenticated endpoint to force a full blocking re-scrape of every external source at will.

**Impact:** Defeats the purpose of `INGEST_SECRET`. Repeated calls can be used to hammer upstream sources (Devfolio, Unstop, Adzuna, etc. — risking your bot getting IP-banned/rate-limited by them), tie up serverless compute (up to the aggregator's timeout per call), and indirectly burn through any per-source API quotas.

**Recommendation:** Remove the `force` query param from the public `/api/opportunities` route (or gate it behind the same `INGEST_SECRET`/internal-only check used in `/api/ingest`).

## 4. Unauthenticated, unthrottled AI endpoints — High

**Where:** `src/app/api/ai/{compare,deadline-insight,digest,match,resume,search,summary,tags}/route.ts`

None of the AI routes require authentication, and there is no rate limiting anywhere in the app (no middleware, no per-IP/per-user throttling). Each of these routes calls Groq (and falls back to Gemini) using your shared API keys.

**Impact:** This is not theoretical — production runtime-error logs already show `429 rate_limit_exceeded` from Groq on `/api/ai/tags`, `/api/ai/summary`, `/api/ai/digest`, and `/api/ai/deadline-insight` across the last few weeks (thousands of occurrences from ~10 distinct users on `/api/ai/tags` alone). A scripted client can trivially exhaust the shared per-minute token budget for every legitimate user, and/or run up your Groq/Gemini bill, just by looping requests — no login required.

**Recommendation:** Add per-IP (or per-uid, now that everyone has one via anonymous auth) rate limiting to `/api/ai/*` — e.g. Upstash Redis + `@upstash/ratelimit`, or a simple in-memory/edge-config token bucket if you want to stay dependency-light. Consider also requiring the (now-ubiquitous) Firebase ID token on these routes so abuse can be tied to and throttled per uid.

## 5. Unauthenticated email relay via `/api/test-nudge` — High

**Where:** `src/app/api/test-nudge/route.ts`

Accepts `{ email }` from an unauthenticated caller and sends an email to that address using your `RESEND_API_KEY`. No auth, no rate limit, no check that the caller owns that inbox.

**Impact:** Anyone can script repeated calls to spam arbitrary inboxes "from" your app, burn your Resend sending quota, or damage your sender reputation. Content is a fixed template today (limiting phishing customization), but the abuse/cost vector stands regardless.

**Recommendation:** Require the caller to be signed in and only send to `auth.currentUser.email` (verify server-side via a Firebase ID token, don't trust a client-supplied address), and add rate limiting.

## 6. reCAPTCHA collected but never verified server-side — Medium

**Where:** `src/components/profile/auth-guard.tsx`

The UI requires a non-empty `captchaToken` before allowing sign-up/sign-in/reset submission, but the token is never sent to Google's `siteverify` endpoint (no server route consumes it — confirmed via search, `siteverify` appears nowhere in the codebase). It only guards the React form; it does nothing against a script calling the Firebase Auth SDK/REST API directly.

**Impact:** Gives a false sense of bot protection. Automated account creation / credential stuffing against Firebase Auth is only as limited as Firebase's own built-in abuse protections, not by this app.

**Recommendation:** Add a small server route that verifies the token via `https://www.google.com/recaptcha/api/siteverify` with `RECAPTCHA_SECRET_KEY`, and have the client call it before (or as part of) sign-up/reset, rejecting on failure.

## 7. Untrusted third-party URLs rendered as clickable links with no scheme check — Medium

**Where:** `src/components/feed/opportunity-card.tsx`, `opportunity-detail.tsx`, `src/components/notifications/notifications-client.tsx`, `src/components/command/command-palette.tsx`; sourced from `src/lib/sources/{devpost,arbeitnow,greenhouse,adzuna,kaggle,codeforces,unstop}.ts`

Several source adapters take `sourceUrl` directly from the third-party API/scrape response (`h.url`, `job.url`, `job.absolute_url`, `j.redirect_url`, etc.) with no scheme validation, and this value is later rendered as `<a href={o.sourceUrl}>` and passed to `window.open(...)` in multiple components.

**Impact:** If any upstream source ever returns a `javascript:`-scheme URL (malicious listing, compromised API, scraping bug), it becomes a live, clickable link inside the app that executes in the app's origin when clicked — essentially stored XSS sourced from a third party you don't control. (Note: `<img src>` uses of scraped URLs, e.g. logos, are not exploitable this way — browsers don't execute `javascript:` as an image source — so this is specifically about the anchor/`window.open` usages.)

**Recommendation:** In `src/lib/sources/_shared.ts` (or a shared normalize step), reject/strip any `sourceUrl`/`logoUrl` that doesn't start with `http://` or `https://` before it enters the corpus.

## 8. No security headers configured — Medium

**Where:** `next.config.ts`

There's no `headers()` config, so the app ships without a Content-Security-Policy, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, or `Permissions-Policy`. (Vercel's platform adds HSTS on custom production domains, but the app itself sets nothing.)

**Impact:** No defense-in-depth against clickjacking (the app could be framed by another site) and no CSP to contain the blast radius if an XSS vector like #7 is ever hit.

**Recommendation:** Add a `headers()` block to `next.config.ts` setting at minimum `X-Frame-Options: DENY` (or a CSP `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and a CSP scoped to the origins you actually load from (Firebase, Groq is server-only so not relevant client-side, Clearbit/favicon logo hosts, Google Calendar, reCAPTCHA).

## 9. `/api/push/subscribe` accepts/deletes any subscription with no ownership check — Low

**Where:** `src/app/api/push/subscribe/route.ts`

`POST` stores any object with a truthy `endpoint` field, no auth. `DELETE` removes any subscription by `endpoint`, no proof the caller owns it. Endpoints are high-entropy secrets in practice (mitigating factor), but there's no server-side validation that the payload even looks like a real `PushSubscription` (valid `keys.p256dh`/`keys.auth`), so malformed junk can be stored.

**Recommendation:** Validate the subscription shape before storing; consider tying subscriptions to a uid so `DELETE` can be scoped to "your own."

## 10. `postcss` transitive advisory via Next.js — Low

`npm audit` reports 2 moderate advisories: PostCSS < 8.5.10, "XSS via Unescaped `</style>` in CSS Stringify Output" (GHSA-qx2v-qp2m-jg93), pulled in transitively through `next@16.2.9`'s bundled tooling. `npm audit fix --force` would downgrade Next to a canary build, which isn't a real fix — this needs to be resolved by upstream Next.js publishing a patched build. Not exploitable via user input in this app today, but worth tracking.

**Recommendation:** Re-run `npm audit` periodically and upgrade Next.js when a patched release lands.

## 11. `pdf-parse` is an old, lightly-maintained dependency fed user uploads — Low

**Where:** `src/app/api/ai/resume/route.ts`, `package.json` (`pdf-parse@^1.1.1`)

The resume-analysis endpoint parses arbitrary user-uploaded PDFs server-side with `pdf-parse@1.1.1`, a package that hasn't seen much maintenance and vendors an old `pdf.js`. There's no explicit file-size cap in app code (only whatever Vercel's platform request-size limit happens to be). PDF parsers are a classic target for malformed-file exploits/DoS.

**Recommendation:** Add an explicit max upload size check before parsing (e.g. reject > 5MB), and keep an eye on this dependency for a maintained alternative (e.g. `unpdf`, `pdfjs-dist` directly) if resume upload becomes a heavily used feature.

## 12. Secrets hygiene — good, no action needed

Checked for completeness: `.env*` is gitignored and no `.env` file, API key, or secret has ever been committed (`git log --all -- '*.env*'` is empty). Server-only secrets (`GROQ_API_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`) are only referenced from files marked `import "server-only"` or API route handlers — none leak into client bundles. The Firebase client config values (`NEXT_PUBLIC_FIREBASE_*`) being public is expected/by-design for Firebase (they're identifiers, not secrets) and is not a vulnerability on its own — just make sure the Firestore rules (finding #2) and Firebase API key restrictions (Google Cloud Console → Credentials → HTTP referrer restrictions) are doing the actual access control.

---

---

## Remediation summary (what was changed on 2026-07-18)

New shared server helpers (all `import "server-only"`):
- `src/lib/server/auth.ts` — verifies Firebase ID tokens against Google's public JWKS using `jose` (no Admin SDK / service-account secret needed; only the public project id). Returns the authenticated uid/email/isAnonymous, fails closed.
- `src/lib/server/rate-limit.ts` — in-memory fixed-window rate limiter + `clientIp()` helper (best-effort per-instance on serverless; swap for Redis for hard multi-instance limits).
- `src/lib/server/http.ts` — `isSameOrigin()` CSRF-style guard and `safeLinkUrl()` scheme/same-origin URL validator.
- `src/lib/server/ai-guard.ts` — shared per-IP throttle (20/min) for the AI routes.

Per-finding fixes:
1. **push/send** (`src/app/api/push/send/route.ts`): now requires same-origin + a valid Firebase ID token, rate-limits per uid (10/min), caps title/body/tag length, and passes `url` through `safeLinkUrl` (in-app path or same-origin http(s) only). `public/sw.js` now rewrites any notification click target to a same-origin path before navigating. Client attaches the ID token (`src/lib/push-client.ts`).
2. **Firestore rules**: added `firestore.rules` (owner-only `users/{uid}` + `users/{uid}/private/**`, default-deny everything else) and `firebase.json`. **Action required:** `firebase deploy --only firestore:rules`, then confirm "test mode" is off in the console.
3. **opportunities force bypass** (`src/app/api/opportunities/route.ts`): removed the `?force=1` param entirely; the public route only ever serves the cached corpus. Forced re-aggregation stays behind `INGEST_SECRET`-gated `/api/ingest` (unchanged; the in-app "Rescan" button already uses `/api/ingest`, so nothing user-facing breaks).
4. **AI endpoints** (all 8 `src/app/api/ai/*`): added `aiRateLimit(req)` per-IP throttle at the top of each handler.
5. **test-nudge** (`src/app/api/test-nudge/route.ts`): requires same-origin + valid ID token, sends **only** to the token's own verified email (client-supplied address ignored), rate-limited 3/hour/uid. Client attaches the token.
6. **reCAPTCHA**: new `src/app/api/auth/verify-captcha/route.ts` calls Google `siteverify`; `auth-guard.tsx` now awaits server verification before sign-up/sign-in/reset. Gracefully no-ops when `RECAPTCHA_SECRET_KEY` is unset so nothing breaks before you configure it. **To activate:** set `RECAPTCHA_SECRET_KEY` in Vercel env.
7. **Scraped URLs** (`src/lib/sources/_shared.ts`): `buildOpportunity` now runs `sourceUrl`/`imageUrl`/`logoUrl` through `safeExternalUrl` (http(s) only) — every live adapter routes through this.
8. **Security headers** (`next.config.ts`): added `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy`. (A full script/style CSP was intentionally not added to avoid breaking Firebase/reCAPTCHA/image CDNs — a good next step if you want to allow-list those origins.)
9. **push/subscribe** (`src/app/api/push/subscribe/route.ts`): validates the subscription shape with zod (https endpoint + p256dh/auth keys), same-origin, rate-limited.
11. **resume upload** (`src/app/api/ai/resume/route.ts`): rejects files > 5 MB before parsing, plus the AI rate limit.

New dependency: `jose@^6.2.3` (added to `package.json`; was already present transitively via `firebase`, so no lockfile surprise). Run `npm install` before the next deploy.

## Remaining actions for you

1. **Deploy Firestore rules** (#2) — the one critical item that can't be done from code: `firebase deploy --only firestore:rules`, then verify in the console. Until this is deployed, the client-side data hole is still open.
2. **Set `RECAPTCHA_SECRET_KEY`** in Vercel to actually turn on captcha verification (#6). Optional but recommended.
3. **Run `npm install`** locally / ensure the next Vercel build picks up `jose`.
4. Track the upstream `postcss`/Next.js advisory (#10) and upgrade when patched.
5. Consider a stricter CSP (#8) and per-uid (not just per-IP) AI rate limiting if abuse continues.

### Notes / residual risk
- The rate limiter is in-memory, so on serverless it's per-instance (best-effort). It stops a single client hammering a warm instance but isn't a hard global cap — move to a shared store (e.g. Upstash Redis) behind the same API if you need strict guarantees.
- `isSameOrigin` blocks cross-site *browser* abuse; combined with the ID-token requirement on the sensitive routes, non-browser scripts are also blocked there (no valid token). Routes that are same-origin-only but tokenless (subscribe, verify-captcha) rely on same-origin + rate limiting.
- Verification performed: full-project `tsc --noEmit` and `eslint` pass clean on all changed files. A full `next build` could not be run in the review sandbox (permission error on the mounted `.next` dir), so run `npm run build` once locally before deploying.
