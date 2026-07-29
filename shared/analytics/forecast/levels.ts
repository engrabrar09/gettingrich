import type { Candle } from '../types.ts'

/**
 * Support and resistance levels.
 *
 * Not a forecast — these are prices where past trading clustered. They sidestep
 * the prediction-accuracy problem entirely, which also makes them the most
 * directly useful output here: they give concrete numbers to hang alert rules
 * on. Their weakness is that they are partly self-fulfilling rather than
 * predictive.
 */

export interface PriceLevel {
  price: number
  kind: 'pivot' | 'resistance' | 'support' | 'swing-high' | 'swing-low' | 'round'
  label: string
  /** Signed % from the reference price: positive = above. */
  distancePct: number
}

export interface PivotSet {
  pivot: number
  resistance: number[]
  support: number[]
}

/** Classic floor-trader pivots from a single bar's high, low and close. */
export function classicPivots(high: number, low: number, close: number): PivotSet {
  const p = (high + low + close) / 3
  const range = high - low
  return {
    pivot: p,
    resistance: [2 * p - low, p + range, high + 2 * (p - low)],
    support: [2 * p - high, p - range, low - 2 * (high - p)],
  }
}

/** Fibonacci pivots — same centre, retracement-ratio spacing. */
export function fibonacciPivots(high: number, low: number, close: number): PivotSet {
  const p = (high + low + close) / 3
  const range = high - low
  return {
    pivot: p,
    resistance: [p + 0.382 * range, p + 0.618 * range, p + range],
    support: [p - 0.382 * range, p - 0.618 * range, p - range],
  }
}

/**
 * N-bar fractal swing points: a bar qualifies when its high is the highest (or
 * low the lowest) across `strength` bars on BOTH sides.
 *
 * `strength` materially changes the output — 2 gives many noisy pivots, 10 gives
 * a handful of major ones. It is a parameter, not a constant, for that reason.
 */
export function swingPoints(
  candles: Candle[],
  strength = 5,
): { highs: { index: number; price: number }[]; lows: { index: number; price: number }[] } {
  const highs: { index: number; price: number }[] = []
  const lows: { index: number; price: number }[] = []
  if (candles.length < strength * 2 + 1) return { highs, lows }

  for (let i = strength; i < candles.length - strength; i++) {
    let isHigh = true
    let isLow = true
    for (let j = i - strength; j <= i + strength; j++) {
      if (j === i) continue
      if (candles[j].high >= candles[i].high) isHigh = false
      if (candles[j].low <= candles[i].low) isLow = false
      if (!isHigh && !isLow) break
    }
    if (isHigh) highs.push({ index: i, price: candles[i].high })
    if (isLow) lows.push({ index: i, price: candles[i].low })
  }
  return { highs, lows }
}

/**
 * Psychological round numbers bracketing a price, at a step scaled to its
 * magnitude — $10 steps near $190, $0.10 steps near $2.40.
 */
export function roundNumbers(price: number, count = 2): number[] {
  if (price <= 0 || !Number.isFinite(price)) return []
  const magnitude = Math.pow(10, Math.floor(Math.log10(price)))
  const step = magnitude / 10
  const base = Math.round(price / step) * step
  const out: number[] = []
  for (let i = -count; i <= count; i++) {
    const level = base + i * step
    if (level > 0) out.push(Number(level.toFixed(10)))
  }
  return out
}

/**
 * Assemble every level into one list, sorted by absolute distance from the last
 * close so the nearest are first. Levels within `dedupeTolerancePct` of an
 * already-included level are dropped — otherwise a pivot and a round number a
 * cent apart both render and clutter the chart.
 */
export function priceLevels(
  candles: Candle[],
  options: { swingStrength?: number; maxSwings?: number; dedupeTolerancePct?: number } = {},
): PriceLevel[] {
  const { swingStrength = 5, maxSwings = 3, dedupeTolerancePct = 0.25 } = options
  if (candles.length === 0) return []

  const lastBar = candles[candles.length - 1]
  const ref = lastBar.close
  if (ref <= 0 || !Number.isFinite(ref)) return []

  const collected: { price: number; kind: PriceLevel['kind']; label: string }[] = []

  const classic = classicPivots(lastBar.high, lastBar.low, lastBar.close)
  collected.push({ price: classic.pivot, kind: 'pivot', label: 'Pivot' })
  classic.resistance.forEach((p, i) =>
    collected.push({ price: p, kind: 'resistance', label: `R${i + 1}` }),
  )
  classic.support.forEach((p, i) =>
    collected.push({ price: p, kind: 'support', label: `S${i + 1}` }),
  )

  const fib = fibonacciPivots(lastBar.high, lastBar.low, lastBar.close)
  fib.resistance.forEach((p, i) =>
    collected.push({ price: p, kind: 'resistance', label: `Fib R${i + 1}` }),
  )
  fib.support.forEach((p, i) =>
    collected.push({ price: p, kind: 'support', label: `Fib S${i + 1}` }),
  )

  const { highs, lows } = swingPoints(candles, swingStrength)
  highs.slice(-maxSwings).forEach((s) =>
    collected.push({ price: s.price, kind: 'swing-high', label: 'Swing high' }),
  )
  lows.slice(-maxSwings).forEach((s) =>
    collected.push({ price: s.price, kind: 'swing-low', label: 'Swing low' }),
  )

  roundNumbers(ref).forEach((p) =>
    collected.push({ price: p, kind: 'round', label: 'Round number' }),
  )

  const sorted = collected
    .filter((l) => l.price > 0 && Number.isFinite(l.price))
    .map((l) => ({ ...l, distancePct: ((l.price - ref) / ref) * 100 }))
    .sort((a, b) => Math.abs(a.distancePct) - Math.abs(b.distancePct))

  const kept: PriceLevel[] = []
  for (const level of sorted) {
    const duplicate = kept.some(
      (k) => Math.abs((k.price - level.price) / ref) * 100 < dedupeTolerancePct,
    )
    if (!duplicate) kept.push(level)
  }
  return kept
}
