# Portfolio Tracker

An installable PWA for tracking investments across US equities/ETFs, precious metals
and crypto — with technical analysis, statistical forecasting, background alerts, and
side-by-side AI verdicts from two independent models.

Hosted free on GitHub Pages; backend on Supabase's free tier.

---

## Status

**Phase 1 (foundation) is complete.** What that does and does not mean:

| Area | Status |
|---|---|
| Analytics engine (`shared/analytics/`) | ✅ **Verified** — 76 tests, Node/Deno parity proven bit-for-bit |
| Supabase schema + RLS | ✅ **Applied** — all 19 tables live; types generated from the real schema |
| RLS *isolation* | ⚠️ **UNVERIFIED** — policies exist, but nothing has proven they isolate two users. Run `npm run verify:rls` |
| Auth (email/password) | ⚠️ Guard + redirect verified in-browser; **signed-in round trip untested** |
| PWA (manifest, icons, service worker) | ✅ Worker activates, manifest + icons serve, console clean |
| App shell, routing, design tokens | ✅ Builds and renders |
| CI deploy → GitHub Pages | ✅ Green; site live |
| Market data providers | ❌ Phase 2 |
| Alert engine | ❌ Phase 4 |
| Dual AI analysis | ❌ Phase 5 |

Every route exists and navigates; unbuilt pages say so explicitly rather than
faking content.

**The one thing to do before putting real data in:** `npm run verify:rls`.
RLS is the only barrier between two users' portfolios, and it is currently
untested. See Security notes below.

### Deviation from plan

The plan specified shadcn/ui. The components here are plain Tailwind instead —
the surface so far is small (nav, cards, one form) and did not justify the
dependency. shadcn/ui is copy-in rather than a package, so adopting it later is
additive, not a migration.

---

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in Supabase URL + anon key
npm run dev
```

Without `.env.local` the app renders a setup screen rather than a blank page.

Then apply `supabase/migrations/` to your project (SQL editor, or `supabase db push`).
**Expect to fix issues on first run** — see Status above.

### Node is not on PATH in some shells

Node 24 lives at `C:\Program Files\nodejs`, but a shell started before installation
has a stale `PATH`. If `node` is "not found", either open a new terminal or prefix:

```bash
$env:Path = "C:\Program Files\nodejs;$env:Path"
```

---

## Commands

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

```bash
deno run --allow-read shared/analytics/__tests__/deno_smoke.ts
```

That last one is not optional ceremony. See below.

---

## Architecture

### `shared/analytics/` — one implementation, three consumers

Technical indicators and forecasting are pure TypeScript with **zero dependencies**,
consumed by:

1. `compute-analytics` Edge Function (Deno) → writes the `indicators` table
2. `evaluate-alerts` Edge Function (Deno) → reads stored values
3. The React app (browser) → charts, and live re-computation when you change a period

**Why computed locally rather than fetched:** Twelve Data gates its indicator
endpoints behind the $29/mo plan, and Finnhub's historical candles are paid. Its
`/time_series` history is free — so one history fetch per asset per day yields every
indicator forever, at zero additional quota. Provider endpoints would cost one call
per indicator per asset per day.

**Portability rules** (enforced by the Deno smoke test):

- Relative imports carry explicit `.ts` extensions — Deno requires them; Vite tolerates
  them via `allowImportingTsExtensions`
- No npm imports, no Node built-ins, no `Date.now()`, no unseeded randomness

A violation typically still passes the browser build and fails only at runtime inside
an Edge Function at 2am. The smoke test runs the module under Deno and cross-checks its
numbers against the Vitest expectations — including a pinned Monte Carlo percentile
that proves Node and Deno agree to nine decimal places.

### `null` means "insufficient history" — never zero

Every indicator returns `number | null`. A ticker listed 40 days ago genuinely has no
SMA 200, and rendering `0` there reads as a total price collapse. `src/lib/format.ts`
renders null as an em dash throughout.

### Honesty mechanisms in forecasting

Forecasts project **ranges, not prices**. Each method carries the thing that tells you
when to distrust it:

| Method | Guard |
|---|---|
| Trend regression | **R²** returned alongside every projection; `null` for a flat series rather than a misleading `1.0` |
| Monte Carlo | Output is a **distribution** (P10–P90), never a number. Seeded, so it is reproducible and testable |
| Seasonality | **Sample count and win rate on every bucket** — with 12 months, one looks significant by chance |
| Support/resistance | Not a forecast at all — just levels where trading clustered |

---

## Security notes

**The repo is public.** GitHub Pages requires it on the free plan. Consequences:

- `.gitignore` was extended — the Vite scaffold only ships `*.local`, which misses a
  plain `.env`, the most common filename.
- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` may be `VITE_`-prefixed.
  Anything `VITE_` is inlined into the bundle and is readable by anyone.
- All provider keys, the Telegram token, the VAPID private key and the Supabase
  **service-role** key live in Supabase Edge Function secrets, never here.

**RLS is the only thing protecting user data.** One non-obvious detail: `user_id` is
denormalised onto `holdings`, `watchlist_items` and `watchlist_settings` so policies
avoid a join. Checking `user_id = auth.uid()` *alone* would let someone insert a row
carrying their own `user_id` but pointing at **another user's** `portfolio_id`. Every
child-table write policy therefore also proves parent ownership via `EXISTS`.

### Two accepted `npm audit` advisories

Both are HIGH and both are deliberately not "fixed":

1. **`react-router` — RSC-mode CSRF bypass** (`GHSA-qwww-vcr4-c8h2`, affects
   `>=7.12.0 <8.3.0`). Installed 7.18.2 is in range, but **react-router-dom 8.x is not
   published** — the only escape is downgrading below 7.12.0. The vulnerability is in
   React Server Components mode; this is a static SPA with no server and no server
   actions, so the path is unreachable. Downgrading seven minor versions to satisfy a
   scanner on unreachable code is the worse trade. Revisit when 8.3.0 ships.
2. **`brace-expansion` DoS** — transitive under `vite-plugin-pwa → workbox-build →
   minimatch`. Build-time only, globbing our own file paths.

---

## Known limitations

1. **Not real-time.** Free tiers are delayed; alert latency is bounded by the cron
   interval. Every price carries an "as of" stamp.
2. **Indicators update daily**, computed from daily candles after US close. Alerts still
   evaluate intraday against those stored levels — "price crosses SMA 50" fires promptly;
   "RSI crosses 30" moves once a day.
3. **Supabase pauses free projects after 7 idle days.** The keepalive workflow pings every
   3 days. `pg_cron` does *not* prevent this — the request must come from outside. Second
   trap: GitHub disables scheduled workflows after 60 days with no commit to the default
   branch, so a quiet repo loses the keepalive and the project pauses a week later. Both
   failures are silent, which is why the keepalive asserts on HTTP status rather than
   firing and forgetting.
4. **iOS Web Push needs Share → Add to Home Screen.** In a Safari tab `PushManager` does
   not exist. Telegram is the recommended primary channel.
5. **No web search in the AI analysis** — the models see only the assembled payload.
6. **Fundamentals are US-centric and point-in-time**; absent for metals and crypto.
7. **Non-US markets (DFM, ADX, Tadawul, NSE) have no viable free data.** Out of scope.
8. **Free LLM tiers are not SLA-backed.** Google cut Gemini's free quotas 50–80% in
   Dec 2025. Two providers run so one degrading does not take the feature down.

---

## Next steps

1. Create the Supabase project and apply the migrations — this is the real test of the
   SQL, and cross-user RLS isolation can only be verified afterwards.
2. Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as GitHub Actions secrets.
3. Confirm the deploy workflow's `VITE_BASE` matches the repo name, or every asset 404s
   on the deployed site.
4. Build the auth flow and the PWA service worker to finish Phase 1.
