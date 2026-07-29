/**
 * Shared analytics — public surface.
 *
 * Consumed by three places, from ONE implementation:
 *   - `compute-analytics` Edge Function (Deno)  -> writes the `indicators` table
 *   - `evaluate-alerts` Edge Function (Deno)    -> reads stored values
 *   - the React app (browser)                   -> charts + live re-computation
 *
 * See types.ts for the portability rules that keep it runnable in both runtimes.
 */

export * from './types.ts'
export * from './indicators/trend.ts'
export * from './indicators/momentum.ts'
export * from './indicators/volatility.ts'
export * from './forecast/regression.ts'
export * from './forecast/montecarlo.ts'
export * from './forecast/seasonality.ts'
export * from './forecast/levels.ts'

import { type Candle, pluck, last } from './types.ts'
import { sma, ema, macd, detectCross, percentFrom, type CrossDirection } from './indicators/trend.ts'
import { rsi, rsiZone, stochastic, roc, rsiDivergence, type RsiZone, type Divergence } from './indicators/momentum.ts'
import { bollinger, atr, rangePosition, returnVolatility } from './indicators/volatility.ts'

/**
 * One row of the `indicators` table: the canonical daily snapshot.
 *
 * Every field is `number | null`. Null means "insufficient history", and MUST
 * be rendered as such rather than coerced to 0 — see verification step 9. A
 * freshly listed ticker legitimately has a null SMA 200 for its first 200
 * sessions, and showing 0 there would read as a catastrophic price collapse.
 */
export interface IndicatorSnapshot {
  date: string
  close: number

  sma20: number | null
  sma50: number | null
  sma200: number | null
  ema12: number | null
  ema26: number | null
  macd: number | null
  macdSignal: number | null
  macdHistogram: number | null
  cross: CrossDirection
  pctFromSma50: number | null
  pctFromSma200: number | null

  rsi14: number | null
  rsiZone: RsiZone | null
  rsiDivergence: Divergence
  stochK: number | null
  stochD: number | null
  roc12: number | null

  bbUpper: number | null
  bbMiddle: number | null
  bbLower: number | null
  bbBandwidth: number | null
  atr14: number | null
  /** ATR as a % of price — the comparable-across-assets form. */
  atrPct: number | null
  high52w: number | null
  low52w: number | null
  rangePositionPct: number | null
  returnVolatility: number | null

  volumeSma20: number | null
  /** Latest volume as a multiple of its 20-bar average. 3.0 = a 3x spike. */
  volumeRatio: number | null
}

/**
 * Compute the full daily snapshot from a candle series.
 *
 * `candles` must be ascending by date and free of duplicates. Returns null for
 * an empty series rather than a snapshot full of nulls, so callers can
 * distinguish "no data at all" from "some indicators not yet available".
 */
export function computeIndicatorSnapshot(candles: Candle[]): IndicatorSnapshot | null {
  if (candles.length === 0) return null

  const closes = pluck(candles, 'close')
  const volumes = pluck(candles, 'volume')
  const lastBar = candles[candles.length - 1]

  const sma20 = sma(closes, 20)
  const sma50 = sma(closes, 50)
  const sma200 = sma(closes, 200)
  const macdResult = macd(closes)
  const rsiSeries = rsi(closes, 14)
  const stoch = stochastic(candles, 14, 3)
  const bands = bollinger(closes, 20, 2)
  const atrSeries = atr(candles, 14)
  const range = rangePosition(candles, 252)
  const volSma = sma(volumes, 20)

  const lastSma50 = last(sma50)
  const lastSma200 = last(sma200)
  const lastAtr = last(atrSeries)
  const lastVolSma = last(volSma)
  const lastRsi = last(rsiSeries)
  const latestVolume = volumes[volumes.length - 1]

  return {
    date: lastBar.date,
    close: lastBar.close,

    sma20: last(sma20),
    sma50: lastSma50,
    sma200: lastSma200,
    ema12: last(ema(closes, 12)),
    ema26: last(ema(closes, 26)),
    macd: last(macdResult.macd),
    macdSignal: last(macdResult.signal),
    macdHistogram: last(macdResult.histogram),
    cross: detectCross(sma50, sma200),
    pctFromSma50: percentFrom(lastBar.close, lastSma50),
    pctFromSma200: percentFrom(lastBar.close, lastSma200),

    rsi14: lastRsi,
    rsiZone: rsiZone(lastRsi),
    rsiDivergence: rsiDivergence(closes, rsiSeries, 14),
    stochK: last(stoch.k),
    stochD: last(stoch.d),
    roc12: last(roc(closes, 12)),

    bbUpper: last(bands.upper),
    bbMiddle: last(bands.middle),
    bbLower: last(bands.lower),
    bbBandwidth: last(bands.bandwidth),
    atr14: lastAtr,
    atrPct: lastAtr === null || lastBar.close === 0 ? null : (lastAtr / lastBar.close) * 100,
    high52w: range?.high ?? null,
    low52w: range?.low ?? null,
    rangePositionPct: range?.positionPct ?? null,
    returnVolatility: returnVolatility(closes),

    volumeSma20: lastVolSma,
    volumeRatio:
      lastVolSma === null || lastVolSma === 0 ? null : latestVolume / lastVolSma,
  }
}
