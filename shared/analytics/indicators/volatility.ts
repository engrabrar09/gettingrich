import { type Candle, type Series, assertPeriod, stdev } from '../types.ts'
import { sma } from './trend.ts'

export interface BollingerResult {
  middle: Series
  upper: Series
  lower: Series
  /** (upper - lower) / middle, as a fraction. A squeeze often precedes a large move. */
  bandwidth: Series
}

/**
 * Bollinger Bands using population standard deviation over the same window as
 * the middle SMA (the convention Bollinger specified — sample stdev gives
 * slightly wider bands and won't match charting platforms).
 */
export function bollinger(values: number[], period = 20, multiplier = 2): BollingerResult {
  assertPeriod(period, 'bollinger')

  const middle = sma(values, period)
  const upper: Series = new Array(values.length).fill(null)
  const lower: Series = new Array(values.length).fill(null)
  const bandwidth: Series = new Array(values.length).fill(null)

  for (let i = period - 1; i < values.length; i++) {
    const mid = middle[i]
    if (mid === null) continue
    const sd = stdev(values.slice(i - period + 1, i + 1))
    const u = mid + multiplier * sd
    const l = mid - multiplier * sd
    upper[i] = u
    lower[i] = l
    bandwidth[i] = mid === 0 ? null : (u - l) / mid
  }

  return { middle, upper, lower, bandwidth }
}

/**
 * True Range for each bar.
 *
 * TR = max(high - low, |high - prevClose|, |low - prevClose|)
 *
 * The first bar has no previous close, so it falls back to high - low. Note
 * this makes TR gap-aware, which is the whole point: a stock that gaps down
 * overnight has real range that high-minus-low alone would miss entirely.
 */
export function trueRange(candles: Candle[]): number[] {
  const out: number[] = new Array(candles.length)
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    if (i === 0) {
      out[i] = c.high - c.low
      continue
    }
    const prevClose = candles[i - 1].close
    out[i] = Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose))
  }
  return out
}

/**
 * Average True Range, Wilder-smoothed.
 *
 * ATR is an absolute number in the asset's own currency, so it is NOT
 * comparable across assets. Divide by price for a comparable figure.
 */
export function atr(candles: Candle[], period = 14): Series {
  assertPeriod(period, 'atr')
  const out: Series = new Array(candles.length).fill(null)
  if (candles.length < period) return out

  const tr = trueRange(candles)
  let acc = 0
  for (let i = 0; i < period; i++) acc += tr[i]
  let prev = acc / period
  out[period - 1] = prev

  for (let i = period; i < candles.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period
    out[i] = prev
  }
  return out
}

export interface RangePosition {
  high: number
  low: number
  /** 0 = at the low, 100 = at the high. Null when high === low. */
  positionPct: number | null
}

/**
 * 52-week (or `window`-bar) high/low and where the last close sits within it.
 *
 * Returns null outright when there is not enough history — a 30-day-old
 * listing has no 52-week range, and reporting its 30-day range as one would be
 * actively misleading.
 */
export function rangePosition(candles: Candle[], window = 252): RangePosition | null {
  if (candles.length < window) return null

  const slice = candles.slice(candles.length - window)
  let high = -Infinity
  let low = Infinity
  for (const c of slice) {
    if (c.high > high) high = c.high
    if (c.low < low) low = c.low
  }

  const close = candles[candles.length - 1].close
  const span = high - low
  return { high, low, positionPct: span === 0 ? null : ((close - low) / span) * 100 }
}

/** Standard deviation of simple period-over-period returns, as a fraction. */
export function returnVolatility(values: number[]): number | null {
  if (values.length < 2) return null
  const returns: number[] = []
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1]
    if (prev === 0 || !Number.isFinite(prev)) continue
    returns.push((values[i] - prev) / prev)
  }
  return returns.length < 2 ? null : stdev(returns)
}
