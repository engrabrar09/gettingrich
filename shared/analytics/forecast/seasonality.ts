import type { Candle } from '../types.ts'

/**
 * Calendar seasonality: average return by month and by weekday.
 *
 * THE DATA-MINING TRAP: with twelve months, one will look like the best month
 * purely by chance even in a random series. That is why `samples` and `winRate`
 * are non-optional fields rather than extras — a 9% average built from 4
 * observations is noise, and the UI must show the reader enough to see that.
 *
 * All date handling uses the UTC accessors. `new Date('2024-01-15')` parses as
 * UTC midnight, so getMonth()/getDay() would shift the bucket by one for any
 * viewer west of Greenwich, quietly corrupting every result.
 */

export interface SeasonalBucket {
  /** 0-11 for months, 0-6 (Sun-Sat) for weekdays. */
  key: number
  label: string
  meanReturnPct: number
  medianReturnPct: number
  /** Fraction 0..1 of observations that were positive. */
  winRate: number
  /** How many observations back this bucket. Below ~5, treat as meaningless. */
  samples: number
}

export interface SeasonalityResult {
  byMonth: SeasonalBucket[]
  byWeekday: SeasonalBucket[]
  /** Highest/lowest mean month, but only among buckets meeting `minSamples`. */
  bestMonth: SeasonalBucket | null
  worstMonth: SeasonalBucket | null
  /** Distinct calendar years covered — under ~5, monthly figures are weak. */
  yearsCovered: number
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function summarise(key: number, label: string, returns: number[]): SeasonalBucket {
  const n = returns.length
  if (n === 0) {
    return { key, label, meanReturnPct: 0, medianReturnPct: 0, winRate: 0, samples: 0 }
  }
  let sum = 0
  let wins = 0
  for (const r of returns) {
    sum += r
    if (r > 0) wins++
  }
  const sorted = [...returns].sort((a, b) => a - b)
  return {
    key,
    label,
    meanReturnPct: sum / n,
    medianReturnPct: median(sorted),
    winRate: wins / n,
    samples: n,
  }
}

/**
 * @param minSamples Buckets with fewer observations are still returned (so the
 *   UI can show "3 samples"), but are excluded from best/worst selection.
 */
export function seasonality(candles: Candle[], minSamples = 5): SeasonalityResult | null {
  if (candles.length < 2) return null

  // --- Monthly: last close of each calendar month, chained month over month ---
  const monthEnds: { year: number; month: number; close: number }[] = []
  for (const c of candles) {
    const d = new Date(`${c.date}T00:00:00Z`)
    if (Number.isNaN(d.getTime())) continue
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth()
    const tail = monthEnds[monthEnds.length - 1]
    if (tail && tail.year === year && tail.month === month) {
      tail.close = c.close
    } else {
      monthEnds.push({ year, month, close: c.close })
    }
  }

  const monthBuckets: number[][] = Array.from({ length: 12 }, () => [])
  for (let i = 1; i < monthEnds.length; i++) {
    const prev = monthEnds[i - 1].close
    if (prev <= 0 || !Number.isFinite(prev)) continue
    const ret = ((monthEnds[i].close - prev) / prev) * 100
    monthBuckets[monthEnds[i].month].push(ret)
  }

  // --- Weekday: simple day-over-day returns ---
  const weekdayBuckets: number[][] = Array.from({ length: 7 }, () => [])
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].close
    if (prev <= 0 || !Number.isFinite(prev)) continue
    const d = new Date(`${candles[i].date}T00:00:00Z`)
    if (Number.isNaN(d.getTime())) continue
    const ret = ((candles[i].close - prev) / prev) * 100
    weekdayBuckets[d.getUTCDay()].push(ret)
  }

  const byMonth = monthBuckets.map((r, i) => summarise(i, MONTHS[i], r))
  const byWeekday = weekdayBuckets.map((r, i) => summarise(i, WEEKDAYS[i], r))

  const eligible = byMonth.filter((b) => b.samples >= minSamples)
  const bestMonth = eligible.length
    ? eligible.reduce((a, b) => (b.meanReturnPct > a.meanReturnPct ? b : a))
    : null
  const worstMonth = eligible.length
    ? eligible.reduce((a, b) => (b.meanReturnPct < a.meanReturnPct ? b : a))
    : null

  const years = new Set(monthEnds.map((m) => m.year))

  return { byMonth, byWeekday, bestMonth, worstMonth, yearsCovered: years.size }
}
