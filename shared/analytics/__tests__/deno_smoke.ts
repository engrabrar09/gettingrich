/**
 * Deno portability smoke test — verification step 2 from the plan.
 *
 * The whole hybrid architecture rests on ONE assumption: that this module runs
 * byte-identically in Deno (Supabase Edge Functions) and in the browser (Vite).
 * Vitest only ever exercises the browser/Node side, so a Deno-only breakage —
 * a missing `.ts` extension, a stray npm import, an accidental Node built-in —
 * would pass CI and fail silently inside a cron job at 2am.
 *
 * This file has ZERO dependencies on purpose: no vitest, no assert module.
 *
 * Run:   deno run --allow-read shared/analytics/__tests__/deno_smoke.ts
 * Exits non-zero on failure.
 */

import { computeIndicatorSnapshot } from '../index.ts'
import { sma, ema } from '../indicators/trend.ts'
import { rsi } from '../indicators/momentum.ts'
import { monteCarlo } from '../forecast/montecarlo.ts'
import { linearRegression } from '../forecast/regression.ts'
import type { Candle } from '../types.ts'

let failures = 0

function check(label: string, actual: unknown, expected: unknown, tolerance = 1e-9): void {
  let ok: boolean
  if (typeof actual === 'number' && typeof expected === 'number') {
    ok = Math.abs(actual - expected) <= tolerance
  } else {
    ok = actual === expected
  }
  if (ok) {
    console.log(`  ok   ${label}`)
  } else {
    console.error(`  FAIL ${label}: expected ${expected}, got ${actual}`)
    failures++
  }
}

console.log('Deno portability smoke test\n')

// --- Values cross-checked against the Vitest suite ---------------------------
// These are the SAME expectations asserted in indicators.test.ts. If Deno and
// the browser ever diverge numerically, these are what catch it.

check('sma([1,2,3,4,5], 3) last', sma([1, 2, 3, 4, 5], 3)[4], 4)
check('ema([1,2,3,4,5], 3) last', ema([1, 2, 3, 4, 5], 3)[4], 4)

const wilder = [
  44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42,
  45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28,
]
check('rsi(wilder, 14)[14]', rsi(wilder, 14)[14] as number, 70.4641, 1e-3)
check('rsi flat series -> 50', rsi([10, 10, 10, 10, 10], 2)[4], 50)

const fit = linearRegression([1, 3, 5, 7, 9])
check('regression slope', fit?.slope, 2)
check('regression r2', fit?.r2, 1)

// --- Seeded Monte Carlo must be identical across runtimes -------------------
// mulberry32 relies on Math.imul and >>> behaving identically. They are spec'd,
// but this is exactly the kind of thing worth proving rather than assuming.
const walk: number[] = [100]
for (let i = 1; i < 300; i++) walk.push(walk[i - 1] * (1 + Math.sin(i * 1.7) * 0.01 + 0.0004))
const mc = monteCarlo(walk, { horizonDays: 30, paths: 500, seed: 42 })
if (mc === null) {
  console.error('  FAIL monteCarlo returned null')
  failures++
} else {
  // Ordering is runtime-independent; the exact p50 is printed so it can be
  // eyeballed against the Vitest run if a divergence is ever suspected.
  check('monteCarlo percentiles ordered', mc.percentiles.p10 < mc.percentiles.p90, true)
  console.log(`  info seeded p50 = ${mc.percentiles.p50.toFixed(10)}`)
}

// --- Full snapshot path, the one the cron actually calls --------------------
const candles: Candle[] = Array.from({ length: 260 }, (_, i) => {
  const close = 100 + Math.sin(i / 9) * 10 + i * 0.05
  return {
    date: new Date(Date.UTC(2023, 0, 1) + i * 86_400_000).toISOString().slice(0, 10),
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1_000_000,
  }
})

const snapshot = computeIndicatorSnapshot(candles)
if (snapshot === null) {
  console.error('  FAIL computeIndicatorSnapshot returned null')
  failures++
} else {
  check('snapshot has sma200', typeof snapshot.sma200 === 'number', true)
  check('snapshot has rsi14', typeof snapshot.rsi14 === 'number', true)
  check('snapshot has 52w range', typeof snapshot.high52w === 'number', true)
}

// Short history must yield nulls, never zeros — verification step 9.
const shortSnapshot = computeIndicatorSnapshot(candles.slice(0, 30))
if (shortSnapshot === null) {
  console.error('  FAIL short snapshot returned null')
  failures++
} else {
  check('short history -> sma200 is null', shortSnapshot.sma200, null)
  check('short history -> 52w high is null', shortSnapshot.high52w, null)
}

console.log(failures === 0 ? '\nPASS — module is Deno-portable' : `\nFAIL — ${failures} check(s) failed`)
if (failures > 0) Deno.exit(1)
