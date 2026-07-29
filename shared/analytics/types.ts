/**
 * Core types for the shared analytics module.
 *
 * PORTABILITY CONTRACT — this module runs unchanged in two runtimes:
 *   1. Deno (Supabase Edge Functions), via relative import
 *   2. The browser (Vite), via the `@analytics` alias
 *
 * Therefore, everywhere under shared/analytics/:
 *   - Relative imports MUST carry explicit `.ts` extensions (Deno requires them).
 *   - No npm imports, no Node built-ins, no `process`, no `fetch`.
 *   - Pure functions only: no I/O, no `Date.now()`, no unseeded randomness.
 *
 * A violation will typically still pass the browser build and only fail at
 * runtime inside an Edge Function, which is why it is written down here.
 */

/** A single OHLCV bar. `date` is an ISO calendar date (YYYY-MM-DD). */
export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/**
 * A value aligned index-for-index with the input candles.
 *
 * `null` means "insufficient history to compute this yet" — it is NOT zero and
 * NOT a neutral reading. Callers must render nulls as "insufficient history"
 * rather than coercing them, or a 40-day-old listing will appear to have a
 * meaningful SMA 200.
 */
export type Series = (number | null)[]

/** Extract a named field from candles as a plain number array. */
export function pluck(candles: Candle[], field: 'open' | 'high' | 'low' | 'close' | 'volume'): number[] {
  return candles.map((c) => c[field])
}

/** Last non-null value of a series, or null if there is none. */
export function last(series: Series): number | null {
  for (let i = series.length - 1; i >= 0; i--) {
    const v = series[i]
    if (v !== null && Number.isFinite(v)) return v
  }
  return null
}

/** Population standard deviation. Returns 0 for a window of identical values. */
export function stdev(values: number[]): number {
  const n = values.length
  if (n === 0) return 0
  let mean = 0
  for (const v of values) mean += v
  mean /= n
  let acc = 0
  for (const v of values) {
    const d = v - mean
    acc += d * d
  }
  return Math.sqrt(acc / n)
}

/** Guard used by every indicator entry point. */
export function assertPeriod(period: number, name: string): void {
  if (!Number.isInteger(period) || period <= 0) {
    throw new RangeError(`${name}: period must be a positive integer, got ${period}`)
  }
}
