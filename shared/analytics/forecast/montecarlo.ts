/**
 * Monte Carlo price simulation under geometric Brownian motion.
 *
 * WHAT THIS IS: a distribution of outcomes implied by the asset's own recent
 * volatility and drift. "P90 = $180" means 10% of simulated paths finished
 * above $180 — not that the price will be $180.
 *
 * WHAT IT IS NOT: a forecast. Two assumptions are wrong in ways that matter:
 *   1. GBM assumes log-normal returns. Real markets have fat tails, so genuine
 *      crashes are rarer here than in reality. Treat downside bands as
 *      optimistic.
 *   2. Drift is estimated from the historical window, so a sample taken during
 *      a bull run embeds that bull run as a permanent expectation.
 *
 * The RNG is seeded and passed explicitly. An unseeded simulation would give a
 * different answer on every page load and could never be unit-tested — see
 * verification step 3 in the plan.
 */

export interface MonteCarloOptions {
  horizonDays: number
  /** Simulated paths. 10k is the default; accuracy scales as 1/sqrt(paths). */
  paths?: number
  /** Any integer. Fixed by default so results are reproducible and testable. */
  seed?: number
  /** If given, reports the fraction of paths whose max touched this price. */
  targetPrice?: number
  /** If given (e.g. 20 for -20%), reports the fraction of paths whose min breached it. */
  drawdownPct?: number
}

export interface MonteCarloResult {
  startPrice: number
  horizonDays: number
  paths: number
  /** Per-step drift and volatility of log returns, as estimated from history. */
  driftDaily: number
  volDaily: number
  percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number }
  /** Fraction 0..1 of paths that touched `targetPrice` at any point. */
  probabilityOfReachingTarget: number | null
  /** Fraction 0..1 of paths that fell `drawdownPct` below the start at any point. */
  probabilityOfDrawdown: number | null
}

/** mulberry32 — small, fast, well-distributed. Deterministic for a given seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box-Muller transform: uniform -> standard normal. */
function standardNormal(rng: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Log returns, skipping any non-positive or non-finite prices. */
export function logReturns(prices: number[]): number[] {
  const out: number[] = []
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1]
    const curr = prices[i]
    if (prev <= 0 || curr <= 0 || !Number.isFinite(prev) || !Number.isFinite(curr)) continue
    out.push(Math.log(curr / prev))
  }
  return out
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

/**
 * Run the simulation. Returns null when there is too little history to estimate
 * volatility (fewer than 30 usable log returns) — a cone built on 5 data points
 * is worse than no cone.
 */
export function monteCarlo(prices: number[], options: MonteCarloOptions): MonteCarloResult | null {
  const { horizonDays, paths = 10_000, seed = 0x5eed, targetPrice, drawdownPct } = options
  if (horizonDays <= 0 || paths <= 0) return null

  const returns = logReturns(prices)
  if (returns.length < 30) return null

  const startPrice = prices[prices.length - 1]
  if (startPrice <= 0 || !Number.isFinite(startPrice)) return null

  let mean = 0
  for (const r of returns) mean += r
  mean /= returns.length

  let variance = 0
  for (const r of returns) {
    const d = r - mean
    variance += d * d
  }
  variance /= returns.length
  const vol = Math.sqrt(variance)

  // Ito correction: the drift of log price is mu - sigma^2/2, not mu.
  const stepDrift = mean - variance / 2

  const rng = mulberry32(seed)
  const terminals = new Float64Array(paths)
  const drawdownFloor = drawdownPct === undefined ? null : startPrice * (1 - drawdownPct / 100)

  let reachedTarget = 0
  let breachedDrawdown = 0

  for (let p = 0; p < paths; p++) {
    let logPrice = Math.log(startPrice)
    let pathMax = startPrice
    let pathMin = startPrice

    for (let t = 0; t < horizonDays; t++) {
      logPrice += stepDrift + vol * standardNormal(rng)
      const price = Math.exp(logPrice)
      if (price > pathMax) pathMax = price
      if (price < pathMin) pathMin = price
    }

    terminals[p] = Math.exp(logPrice)
    if (targetPrice !== undefined && pathMax >= targetPrice) reachedTarget++
    if (drawdownFloor !== null && pathMin <= drawdownFloor) breachedDrawdown++
  }

  const sorted = Array.from(terminals).sort((a, b) => a - b)

  return {
    startPrice,
    horizonDays,
    paths,
    driftDaily: mean,
    volDaily: vol,
    percentiles: {
      p10: percentile(sorted, 0.1),
      p25: percentile(sorted, 0.25),
      p50: percentile(sorted, 0.5),
      p75: percentile(sorted, 0.75),
      p90: percentile(sorted, 0.9),
    },
    probabilityOfReachingTarget: targetPrice === undefined ? null : reachedTarget / paths,
    probabilityOfDrawdown: drawdownPct === undefined ? null : breachedDrawdown / paths,
  }
}
