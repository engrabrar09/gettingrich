import { describe, it, expect } from 'vitest'
import type { Candle } from '../types.ts'
import {
  linearRegression,
  logLinearRegression,
  project,
  annualisedSlopePct,
} from '../forecast/regression.ts'
import { monteCarlo, logReturns } from '../forecast/montecarlo.ts'
import { seasonality } from '../forecast/seasonality.ts'
import { classicPivots, fibonacciPivots, swingPoints, roundNumbers, priceLevels } from '../forecast/levels.ts'

/** Daily candles walking forward from a start date, skipping nothing. */
function dailyCandles(startISO: string, closes: number[]): Candle[] {
  const start = new Date(`${startISO}T00:00:00Z`)
  return closes.map((close, i) => {
    const d = new Date(start.getTime() + i * 86_400_000)
    return {
      date: d.toISOString().slice(0, 10),
      open: close,
      high: close,
      low: close,
      close,
      volume: 1000,
    }
  })
}

describe('linearRegression', () => {
  it('recovers an exact line with a perfect fit', () => {
    // y = 2x + 1 over x = 0..4
    const fit = linearRegression([1, 3, 5, 7, 9])
    expect(fit).not.toBeNull()
    expect(fit!.slope).toBeCloseTo(2, 10)
    expect(fit!.intercept).toBeCloseTo(1, 10)
    expect(fit!.r2).toBeCloseTo(1, 10)
    expect(fit!.residualStdev).toBeCloseTo(0, 10)
    expect(fit!.n).toBe(5)
  })

  it('returns a NULL r-squared for a flat series rather than 1.0', () => {
    // A horizontal line "fits perfectly", but there is no variance to explain.
    // Reporting 1.0 would tell the user the trend is perfectly predictive.
    const fit = linearRegression([5, 5, 5, 5])
    expect(fit).not.toBeNull()
    expect(fit!.slope).toBeCloseTo(0, 10)
    expect(fit!.r2).toBeNull()
  })

  it('reports a low r-squared for a poor fit', () => {
    const fit = linearRegression([1, 9, 2, 8, 3, 7])
    expect(fit!.r2).not.toBeNull()
    expect(fit!.r2!).toBeLessThan(0.3)
  })

  it('needs at least two points', () => {
    expect(linearRegression([])).toBeNull()
    expect(linearRegression([5])).toBeNull()
  })
})

describe('logLinearRegression', () => {
  it('recovers constant compound growth', () => {
    // Exact 10% per step: ln(y) is linear with slope ln(1.1)
    const values = Array.from({ length: 10 }, (_, i) => 100 * Math.pow(1.1, i))
    const fit = logLinearRegression(values)
    expect(fit).not.toBeNull()
    expect(fit!.slope).toBeCloseTo(Math.log(1.1), 10)
    expect(fit!.r2).toBeCloseTo(1, 10)
  })

  it('refuses non-positive values instead of clamping them', () => {
    // Clamping would silently change the model being fitted.
    expect(logLinearRegression([10, 0, 20])).toBeNull()
    expect(logLinearRegression([10, -5, 20])).toBeNull()
  })
})

describe('project', () => {
  it('extends a perfect line with a zero-width band', () => {
    const fit = linearRegression([1, 3, 5, 7, 9])!
    const points = project(fit, 3)
    expect(points).toHaveLength(3)
    // n = 5, so step 1 is x = 5 -> 2*5 + 1 = 11
    expect(points[0].step).toBe(1)
    expect(points[0].value).toBeCloseTo(11, 10)
    expect(points[1].value).toBeCloseTo(13, 10)
    expect(points[2].value).toBeCloseTo(15, 10)
    expect(points[0].upper - points[0].lower).toBeCloseTo(0, 10)
  })

  it('widens the band in proportion to residual scatter', () => {
    const fit = linearRegression([1, 9, 2, 8, 3, 7])!
    const [first] = project(fit, 1)
    expect(first.upper).toBeGreaterThan(first.value)
    expect(first.lower).toBeLessThan(first.value)
    expect(first.upper - first.lower).toBeCloseTo(2 * 1.96 * fit.residualStdev, 8)
  })

  it('exponentiates back to price space when the fit was in log space', () => {
    const values = Array.from({ length: 10 }, (_, i) => 100 * Math.pow(1.1, i))
    const fit = logLinearRegression(values)!
    const [next] = project(fit, 1, { logSpace: true })
    // Next value should continue the 10% compounding from the last point
    expect(next.value).toBeCloseTo(100 * Math.pow(1.1, 10), 4)
  })
})

describe('annualisedSlopePct', () => {
  it('annualises a log-space slope as compound growth', () => {
    const fit = { slope: Math.log(1.001), intercept: 0, r2: 1, residualStdev: 0, n: 100 }
    expect(annualisedSlopePct(fit, 100, 252, true)).toBeCloseTo(
      (Math.pow(1.001, 252) - 1) * 100,
      6,
    )
  })

  it('guards a zero last value in linear space', () => {
    const fit = { slope: 1, intercept: 0, r2: 1, residualStdev: 0, n: 10 }
    expect(annualisedSlopePct(fit, 0, 252, false)).toBeNull()
  })
})

describe('logReturns', () => {
  it('computes ln(curr/prev) and skips non-positive prices', () => {
    expect(logReturns([100, 110])[0]).toBeCloseTo(Math.log(1.1), 10)
    expect(logReturns([100, 0, 110])).toHaveLength(0)
  })
})

describe('monteCarlo', () => {
  // A deterministic pseudo-random walk so the tests do not depend on Math.random.
  const prices = (() => {
    const out = [100]
    for (let i = 1; i < 300; i++) {
      out.push(out[i - 1] * (1 + Math.sin(i * 1.7) * 0.01 + 0.0004))
    }
    return out
  })()

  it('is REPRODUCIBLE for a given seed', () => {
    // Verification step 3 in the plan. An unseeded simulation would return a
    // different answer on every page load and could never be tested at all.
    const a = monteCarlo(prices, { horizonDays: 30, paths: 500, seed: 42 })
    const b = monteCarlo(prices, { horizonDays: 30, paths: 500, seed: 42 })
    expect(a).not.toBeNull()
    expect(a!.percentiles).toEqual(b!.percentiles)
  })

  it('produces the SAME digits as Deno for the same seed', () => {
    // Cross-runtime pin. This exact value was produced by
    //   deno run --allow-read shared/analytics/__tests__/deno_smoke.ts
    // on Deno 2.9.4. Asserting it here proves Node and Deno agree bit-for-bit,
    // which is what the hybrid server/client architecture depends on — the
    // mulberry32 PRNG leans on Math.imul and >>> having identical semantics.
    //
    // If this ever fails, the two runtimes have diverged and stored indicators
    // will silently disagree with what the browser recomputes.
    const r = monteCarlo(prices, { horizonDays: 30, paths: 500, seed: 42 })!
    expect(r.percentiles.p50).toBeCloseTo(112.5784395623, 9)
  })

  it('produces a different distribution for a different seed', () => {
    const a = monteCarlo(prices, { horizonDays: 30, paths: 500, seed: 1 })
    const b = monteCarlo(prices, { horizonDays: 30, paths: 500, seed: 2 })
    expect(a!.percentiles.p50).not.toBe(b!.percentiles.p50)
  })

  it('returns ordered percentiles', () => {
    const r = monteCarlo(prices, { horizonDays: 60, paths: 2000, seed: 7 })!
    expect(r.percentiles.p10).toBeLessThan(r.percentiles.p25)
    expect(r.percentiles.p25).toBeLessThan(r.percentiles.p50)
    expect(r.percentiles.p50).toBeLessThan(r.percentiles.p75)
    expect(r.percentiles.p75).toBeLessThan(r.percentiles.p90)
  })

  it('widens the cone as the horizon extends', () => {
    const short = monteCarlo(prices, { horizonDays: 10, paths: 2000, seed: 3 })!
    const long = monteCarlo(prices, { horizonDays: 120, paths: 2000, seed: 3 })!
    const shortSpread = short.percentiles.p90 - short.percentiles.p10
    const longSpread = long.percentiles.p90 - long.percentiles.p10
    expect(longSpread).toBeGreaterThan(shortSpread)
  })

  it('refuses to build a cone from too little history', () => {
    // Fewer than 30 usable returns. A cone on 5 points is worse than no cone.
    expect(monteCarlo([100, 101, 102, 103, 104], { horizonDays: 30 })).toBeNull()
  })

  it('reports probabilities as fractions in 0..1', () => {
    const r = monteCarlo(prices, {
      horizonDays: 60,
      paths: 1000,
      seed: 11,
      targetPrice: prices[prices.length - 1] * 1.2,
      drawdownPct: 15,
    })!
    expect(r.probabilityOfReachingTarget).toBeGreaterThanOrEqual(0)
    expect(r.probabilityOfReachingTarget).toBeLessThanOrEqual(1)
    expect(r.probabilityOfDrawdown).toBeGreaterThanOrEqual(0)
    expect(r.probabilityOfDrawdown).toBeLessThanOrEqual(1)
  })

  it('leaves probabilities null when not requested', () => {
    const r = monteCarlo(prices, { horizonDays: 30, paths: 200, seed: 5 })!
    expect(r.probabilityOfReachingTarget).toBeNull()
    expect(r.probabilityOfDrawdown).toBeNull()
  })

  it('makes a nearer target more likely than a farther one', () => {
    const spot = prices[prices.length - 1]
    const near = monteCarlo(prices, { horizonDays: 90, paths: 2000, seed: 9, targetPrice: spot * 1.02 })!
    const far = monteCarlo(prices, { horizonDays: 90, paths: 2000, seed: 9, targetPrice: spot * 1.5 })!
    expect(near.probabilityOfReachingTarget!).toBeGreaterThan(far.probabilityOfReachingTarget!)
  })
})

describe('seasonality', () => {
  it('buckets by UTC month and counts samples', () => {
    // Three years of daily data so each month gets three observations.
    const closes = Array.from({ length: 365 * 3 }, (_, i) => 100 + i * 0.01)
    const candles = dailyCandles('2021-01-01', closes)
    const result = seasonality(candles, 2)

    expect(result).not.toBeNull()
    expect(result!.byMonth).toHaveLength(12)
    expect(result!.byWeekday).toHaveLength(7)
    expect(result!.yearsCovered).toBeGreaterThanOrEqual(3)
    // Every month should have accumulated at least two month-over-month returns
    for (const bucket of result!.byMonth) {
      expect(bucket.samples).toBeGreaterThanOrEqual(2)
    }
  })

  it('excludes thin buckets from best/worst selection', () => {
    // Only ~4 months of data, so no bucket reaches minSamples = 5.
    const candles = dailyCandles('2024-01-01', Array.from({ length: 120 }, (_, i) => 100 + i))
    const result = seasonality(candles, 5)
    expect(result!.bestMonth).toBeNull()
    expect(result!.worstMonth).toBeNull()
  })

  it('does not shift buckets across a timezone boundary', () => {
    // '2024-03-01' must land in March (index 2) regardless of the host timezone.
    // Using getMonth() instead of getUTCMonth() would put it in February for
    // any viewer west of Greenwich.
    const candles = dailyCandles('2024-02-27', [10, 11, 12, 13, 14, 15])
    const result = seasonality(candles, 1)
    const march = result!.byMonth[2]
    expect(march.samples).toBeGreaterThan(0)
  })

  it('reports a win rate consistent with a monotonically rising series', () => {
    const candles = dailyCandles('2020-01-01', Array.from({ length: 365 * 2 }, (_, i) => 100 + i))
    const result = seasonality(candles, 2)
    for (const bucket of result!.byMonth) {
      if (bucket.samples > 0) expect(bucket.winRate).toBe(1)
    }
  })

  it('returns null for a series too short to difference', () => {
    expect(seasonality(dailyCandles('2024-01-01', [100]), 1)).toBeNull()
  })
})

describe('pivots', () => {
  it('computes classic pivots by hand', () => {
    // H=12, L=8, C=11 -> P = 31/3 = 10.3333, range = 4
    //   R1 = 2P - L = 12.6667 ; S1 = 2P - H = 8.6667
    //   R2 = P + range = 14.3333 ; S2 = P - range = 6.3333
    const p = classicPivots(12, 8, 11)
    expect(p.pivot).toBeCloseTo(31 / 3, 10)
    expect(p.resistance[0]).toBeCloseTo(2 * (31 / 3) - 8, 10)
    expect(p.support[0]).toBeCloseTo(2 * (31 / 3) - 12, 10)
    expect(p.resistance[1]).toBeCloseTo(31 / 3 + 4, 10)
    expect(p.support[1]).toBeCloseTo(31 / 3 - 4, 10)
  })

  it('spaces fibonacci pivots by retracement ratios', () => {
    const f = fibonacciPivots(12, 8, 11)
    const range = 4
    expect(f.resistance[0]).toBeCloseTo(31 / 3 + 0.382 * range, 10)
    expect(f.resistance[1]).toBeCloseTo(31 / 3 + 0.618 * range, 10)
    expect(f.support[0]).toBeCloseTo(31 / 3 - 0.382 * range, 10)
  })
})

describe('swingPoints', () => {
  it('finds a peak that dominates both sides', () => {
    const closes = [1, 2, 3, 10, 3, 2, 1]
    const candles = dailyCandles('2024-01-01', closes)
    const { highs } = swingPoints(candles, 3)
    expect(highs).toHaveLength(1)
    expect(highs[0].index).toBe(3)
    expect(highs[0].price).toBe(10)
  })

  it('returns nothing when the series is shorter than the window', () => {
    const candles = dailyCandles('2024-01-01', [1, 2, 3])
    const { highs, lows } = swingPoints(candles, 5)
    expect(highs).toHaveLength(0)
    expect(lows).toHaveLength(0)
  })
})

describe('roundNumbers', () => {
  it('scales the step to the price magnitude', () => {
    // Near $190 the step is $10; near $2.40 it is $0.10.
    expect(roundNumbers(190, 1)).toContain(190)
    const small = roundNumbers(2.4, 1)
    expect(small.some((v) => Math.abs(v - 2.4) < 1e-9)).toBe(true)
    expect(Math.max(...small)).toBeLessThan(3)
  })

  it('never emits a non-positive level', () => {
    for (const level of roundNumbers(0.5, 5)) expect(level).toBeGreaterThan(0)
  })

  it('returns nothing for an invalid price', () => {
    expect(roundNumbers(0)).toEqual([])
    expect(roundNumbers(-5)).toEqual([])
  })
})

describe('priceLevels', () => {
  const candles = dailyCandles('2024-01-01', Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 4) * 8))

  it('sorts by absolute distance from the last close', () => {
    const levels = priceLevels(candles)
    for (let i = 1; i < levels.length; i++) {
      expect(Math.abs(levels[i].distancePct)).toBeGreaterThanOrEqual(
        Math.abs(levels[i - 1].distancePct),
      )
    }
  })

  it('deduplicates levels that would render on top of each other', () => {
    const levels = priceLevels(candles, { dedupeTolerancePct: 1 })
    for (let i = 0; i < levels.length; i++) {
      for (let j = i + 1; j < levels.length; j++) {
        const gapPct = Math.abs((levels[i].price - levels[j].price) / candles[candles.length - 1].close) * 100
        expect(gapPct).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('returns nothing for an empty series', () => {
    expect(priceLevels([])).toEqual([])
  })
})
