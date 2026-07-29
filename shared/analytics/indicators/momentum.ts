import { type Candle, type Series, assertPeriod } from '../types.ts'

/**
 * Relative Strength Index, using Wilder's smoothing (the standard).
 *
 * Needs `period + 1` values, because it works on period-over-period *changes*.
 *
 * Divide-by-zero handling — this is where naive implementations produce NaN:
 *   - no losses, some gains  -> 100 (maximum strength)
 *   - no gains, some losses  -> 0
 *   - neither (a perfectly flat series) -> 50, the neutral reading
 *
 * That last case is the one that matters in practice: a stock halted at one
 * price, or a thinly-traded metal fixing, yields 0/0. Returning NaN there
 * poisons every downstream consumer including the alert engine.
 */
export function rsi(values: number[], period = 14): Series {
  assertPeriod(period, 'rsi')
  const out: Series = new Array(values.length).fill(null)
  if (values.length < period + 1) return out

  let gainSum = 0
  let lossSum = 0
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1]
    if (change > 0) gainSum += change
    else lossSum -= change
  }

  let avgGain = gainSum / period
  let avgLoss = lossSum / period
  out[period] = rsiFrom(avgGain, avgLoss)

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    out[i] = rsiFrom(avgGain, avgLoss)
  }

  return out
}

function rsiFrom(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100
  if (avgGain === 0) return 0
  return 100 - 100 / (1 + avgGain / avgLoss)
}

export type RsiZone = 'overbought' | 'oversold' | 'neutral'

export function rsiZone(value: number | null, overbought = 70, oversold = 30): RsiZone | null {
  if (value === null) return null
  if (value >= overbought) return 'overbought'
  if (value <= oversold) return 'oversold'
  return 'neutral'
}

export interface StochasticResult {
  k: Series
  d: Series
}

/**
 * Stochastic Oscillator.
 *
 * %K = 100 * (close - lowestLow) / (highestHigh - lowestLow) over `period`.
 * %D = simple moving average of %K over `smoothing`.
 *
 * When highestHigh === lowestLow (a flat window) the denominator is zero; we
 * return 50 rather than NaN, matching the RSI flat-series convention above.
 */
export function stochastic(candles: Candle[], period = 14, smoothing = 3): StochasticResult {
  assertPeriod(period, 'stochastic.period')
  assertPeriod(smoothing, 'stochastic.smoothing')

  const k: Series = new Array(candles.length).fill(null)

  for (let i = period - 1; i < candles.length; i++) {
    let highest = -Infinity
    let lowest = Infinity
    for (let j = i - period + 1; j <= i; j++) {
      if (candles[j].high > highest) highest = candles[j].high
      if (candles[j].low < lowest) lowest = candles[j].low
    }
    const range = highest - lowest
    k[i] = range === 0 ? 50 : ((candles[i].close - lowest) / range) * 100
  }

  // %D smooths %K, so it must be computed over the defined region only.
  const d: Series = new Array(candles.length).fill(null)
  const firstDefined = k.findIndex((v) => v !== null)
  if (firstDefined !== -1) {
    const compact = k.slice(firstDefined) as number[]
    for (let i = smoothing - 1; i < compact.length; i++) {
      let sum = 0
      for (let j = i - smoothing + 1; j <= i; j++) sum += compact[j]
      d[firstDefined + i] = sum / smoothing
    }
  }

  return { k, d }
}

/**
 * Rate of Change, as a percentage over `period` bars.
 * Null where the reference value is missing or zero.
 */
export function roc(values: number[], period = 12): Series {
  assertPeriod(period, 'roc')
  const out: Series = new Array(values.length).fill(null)
  for (let i = period; i < values.length; i++) {
    const ref = values[i - period]
    if (ref === 0 || !Number.isFinite(ref)) continue
    out[i] = ((values[i] - ref) / ref) * 100
  }
  return out
}

export type Divergence = 'bullish' | 'bearish' | null

/**
 * Crude RSI divergence over a lookback window: price makes a new extreme while
 * RSI does not.
 *
 * Deliberately simple — it compares window endpoints rather than detecting
 * swing pivots, so it flags a *tendency*, not a textbook divergence. Treated as
 * a hint in the UI, never as a signal, and never wired to an alert rule.
 */
export function rsiDivergence(prices: number[], rsiSeries: Series, lookback = 14): Divergence {
  const n = prices.length
  if (n < lookback + 1) return null

  const priceNow = prices[n - 1]
  const pricePrev = prices[n - 1 - lookback]
  const rsiNow = rsiSeries[n - 1]
  const rsiPrev = rsiSeries[n - 1 - lookback]
  if (rsiNow === null || rsiPrev === null) return null

  if (priceNow > pricePrev && rsiNow < rsiPrev) return 'bearish'
  if (priceNow < pricePrev && rsiNow > rsiPrev) return 'bullish'
  return null
}
