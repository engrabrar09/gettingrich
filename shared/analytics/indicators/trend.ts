import { type Series, assertPeriod } from '../types.ts'

/**
 * Simple Moving Average. O(n) via a rolling sum.
 * Returns null for the first `period - 1` positions.
 */
export function sma(values: number[], period: number): Series {
  assertPeriod(period, 'sma')
  const out: Series = new Array(values.length).fill(null)
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}

/**
 * Exponential Moving Average.
 *
 * Seeded with the SMA of the first `period` values — the conventional seed, and
 * the reason output starts at index `period - 1` rather than index 0. Seeding
 * with values[0] instead is a common shortcut that produces subtly different
 * numbers from every charting platform, so we don't.
 */
export function ema(values: number[], period: number): Series {
  assertPeriod(period, 'ema')
  const out: Series = new Array(values.length).fill(null)
  if (values.length < period) return out

  const k = 2 / (period + 1)
  let acc = 0
  for (let i = 0; i < period; i++) acc += values[i]
  let prev = acc / period
  out[period - 1] = prev

  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

export interface MacdResult {
  macd: Series
  signal: Series
  histogram: Series
}

/**
 * MACD. Default (12, 26, 9).
 *
 * The signal line is an EMA of the MACD line, but the MACD line has nulls at
 * the front. We compact to the defined values, run the EMA over those, then
 * re-expand to the original alignment — running an EMA across nulls would
 * silently treat them as gaps and shift every subsequent value.
 */
export function macd(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdResult {
  assertPeriod(fastPeriod, 'macd.fast')
  assertPeriod(slowPeriod, 'macd.slow')
  assertPeriod(signalPeriod, 'macd.signal')

  const fast = ema(values, fastPeriod)
  const slow = ema(values, slowPeriod)

  const macdLine: Series = values.map((_, i) => {
    const f = fast[i]
    const s = slow[i]
    return f === null || s === null ? null : f - s
  })

  const firstDefined = macdLine.findIndex((v) => v !== null)
  const signal: Series = new Array(values.length).fill(null)
  const histogram: Series = new Array(values.length).fill(null)

  if (firstDefined !== -1) {
    const compact = macdLine.slice(firstDefined) as number[]
    const compactSignal = ema(compact, signalPeriod)
    for (let i = 0; i < compactSignal.length; i++) {
      const s = compactSignal[i]
      if (s === null) continue
      const idx = firstDefined + i
      signal[idx] = s
      histogram[idx] = (macdLine[idx] as number) - s
    }
  }

  return { macd: macdLine, signal, histogram }
}

export type CrossDirection = 'golden' | 'death' | null

/**
 * Detect a moving-average crossover on the final bar.
 *
 * Returns a direction only on the bar where the crossing actually happens —
 * not for every bar where fast merely sits above slow. This is the same
 * transition-not-state distinction the alert engine relies on.
 */
export function detectCross(fast: Series, slow: Series): CrossDirection {
  const n = Math.min(fast.length, slow.length)
  if (n < 2) return null

  const fPrev = fast[n - 2]
  const sPrev = slow[n - 2]
  const fNow = fast[n - 1]
  const sNow = slow[n - 1]
  if (fPrev === null || sPrev === null || fNow === null || sNow === null) return null

  if (fPrev <= sPrev && fNow > sNow) return 'golden'
  if (fPrev >= sPrev && fNow < sNow) return 'death'
  return null
}

/** Percentage distance from `price` to `reference`. Null if reference is missing or zero. */
export function percentFrom(price: number, reference: number | null): number | null {
  if (reference === null || reference === 0 || !Number.isFinite(reference)) return null
  return ((price - reference) / reference) * 100
}
