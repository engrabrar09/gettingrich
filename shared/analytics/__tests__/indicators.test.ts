import { describe, it, expect } from 'vitest'
import type { Candle } from '../types.ts'
import { last, stdev } from '../types.ts'
import { sma, ema, macd, detectCross, percentFrom } from '../indicators/trend.ts'
import { rsi, rsiZone, stochastic, roc } from '../indicators/momentum.ts'
import { bollinger, atr, trueRange, rangePosition, returnVolatility } from '../indicators/volatility.ts'

/** Build candles from closes; OHLC collapse to the close unless overridden. */
function candlesFromCloses(closes: number[], volume = 1000): Candle[] {
  return closes.map((close, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: close,
    high: close,
    low: close,
    close,
    volume,
  }))
}

describe('sma', () => {
  it('matches a hand-computed average and nulls the warm-up window', () => {
    // [1,2,3,4,5] period 3 -> (1+2+3)/3=2, (2+3+4)/3=3, (3+4+5)/3=4
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })

  it('returns all nulls when history is shorter than the period', () => {
    expect(sma([1, 2], 5)).toEqual([null, null])
  })

  it('rolling sum does not drift over a long series', () => {
    const values = Array.from({ length: 500 }, (_, i) => i + 1)
    const result = sma(values, 10)
    // Last window is 491..500, mean 495.5
    expect(last(result)).toBeCloseTo(495.5, 10)
  })

  it('rejects a non-positive period rather than returning nonsense', () => {
    expect(() => sma([1, 2, 3], 0)).toThrow(RangeError)
    expect(() => sma([1, 2, 3], -1)).toThrow(RangeError)
  })
})

describe('ema', () => {
  it('seeds from the SMA of the first period, not from values[0]', () => {
    // [1,2,3,4,5] period 3: seed = (1+2+3)/3 = 2, k = 2/(3+1) = 0.5
    //   i=3: 4*0.5 + 2*0.5 = 3
    //   i=4: 5*0.5 + 3*0.5 = 4
    expect(ema([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })

  it('returns all nulls when history is shorter than the period', () => {
    expect(ema([1, 2, 3], 5)).toEqual([null, null, null])
  })

  it('converges toward a constant series', () => {
    const flat = new Array(50).fill(7)
    expect(last(ema(flat, 10))).toBeCloseTo(7, 10)
  })
})

describe('macd', () => {
  const closes = Array.from({ length: 60 }, (_, i) => 100 + i)

  it('equals fast EMA minus slow EMA at every defined index', () => {
    const fast = ema(closes, 12)
    const slow = ema(closes, 26)
    const result = macd(closes, 12, 26, 9)
    for (let i = 0; i < closes.length; i++) {
      if (fast[i] === null || slow[i] === null) {
        expect(result.macd[i]).toBeNull()
      } else {
        expect(result.macd[i]).toBeCloseTo((fast[i] as number) - (slow[i] as number), 10)
      }
    }
  })

  it('starts the signal line 8 bars after the MACD line, not at index 0', () => {
    // The signal EMA runs over the COMPACTED macd line. If it were run across
    // the leading nulls instead, every subsequent value would be shifted.
    const result = macd(closes, 12, 26, 9)
    const firstMacd = result.macd.findIndex((v) => v !== null)
    const firstSignal = result.signal.findIndex((v) => v !== null)
    expect(firstMacd).toBe(25)
    expect(firstSignal).toBe(firstMacd + 8)
  })

  it('histogram equals macd minus signal wherever both exist', () => {
    const result = macd(closes, 12, 26, 9)
    for (let i = 0; i < closes.length; i++) {
      if (result.macd[i] !== null && result.signal[i] !== null) {
        expect(result.histogram[i]).toBeCloseTo(
          (result.macd[i] as number) - (result.signal[i] as number),
          10,
        )
      } else {
        expect(result.histogram[i]).toBeNull()
      }
    }
  })

  it('produces no values at all when history is too short', () => {
    const result = macd([1, 2, 3], 12, 26, 9)
    expect(result.macd.every((v) => v === null)).toBe(true)
    expect(result.signal.every((v) => v === null)).toBe(true)
  })
})

describe('detectCross', () => {
  it('fires on the transition bar only', () => {
    // fast crosses from below to above on the final bar
    expect(detectCross([1, 3], [2, 2])).toBe('golden')
    expect(detectCross([3, 1], [2, 2])).toBe('death')
  })

  it('does NOT fire while fast merely remains above slow', () => {
    // This is the state-vs-transition distinction the alert engine depends on.
    expect(detectCross([3, 4], [1, 2])).toBeNull()
    expect(detectCross([1, 2], [3, 4])).toBeNull()
  })

  it('returns null when either series is missing a value', () => {
    expect(detectCross([null, 3], [2, 2])).toBeNull()
    expect(detectCross([1, 3], [null, 2])).toBeNull()
    expect(detectCross([5], [2])).toBeNull()
  })
})

describe('percentFrom', () => {
  it('computes signed distance', () => {
    expect(percentFrom(110, 100)).toBeCloseTo(10, 10)
    expect(percentFrom(90, 100)).toBeCloseTo(-10, 10)
  })

  it('guards against a zero or missing reference', () => {
    expect(percentFrom(100, 0)).toBeNull()
    expect(percentFrom(100, null)).toBeNull()
  })
})

describe('rsi', () => {
  it('matches a hand-computed Wilder value', () => {
    // Wilder's classic series. Over the first 14 changes:
    //   gains  = 0.06+0.72+0.50+0.27+0.32+0.42+0.24+0.14+0.67 = 3.34
    //   losses = 0.25+0.54+0.19+0.42                          = 1.40
    //   avgGain = 3.34/14 = 0.2385714 ; avgLoss = 1.40/14 = 0.1
    //   RS  = 2.3857143
    //   RSI = 100 - 100/(1+RS) = 70.4641
    const prices = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42,
      45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28,
    ]
    const result = rsi(prices, 14)
    expect(result[13]).toBeNull() // needs period + 1 values
    expect(result[14]).toBeCloseTo(70.4641, 3)
  })

  it('returns 50 for a perfectly flat series instead of NaN', () => {
    // 0/0 in the RS ratio. This is the case that silently poisons alerts.
    const result = rsi([10, 10, 10, 10, 10], 2)
    expect(result[2]).toBe(50)
    expect(result[4]).toBe(50)
    expect(result.every((v) => v === null || Number.isFinite(v))).toBe(true)
  })

  it('returns 100 when there are no losses and 0 when there are no gains', () => {
    expect(rsi([10, 11, 12, 13, 14], 2)[4]).toBe(100)
    expect(rsi([14, 13, 12, 11, 10], 2)[4]).toBe(0)
  })

  it('needs period + 1 values, not period', () => {
    expect(rsi([1, 2, 3], 3).every((v) => v === null)).toBe(true)
    expect(last(rsi([1, 2, 3, 4], 3))).not.toBeNull()
  })

  it('stays within 0..100 across a noisy series', () => {
    const prices = Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i / 3) * 12 + (i % 7))
    for (const v of rsi(prices, 14)) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('rsiZone', () => {
  it('classifies against the default 70/30 thresholds', () => {
    expect(rsiZone(75)).toBe('overbought')
    expect(rsiZone(70)).toBe('overbought')
    expect(rsiZone(25)).toBe('oversold')
    expect(rsiZone(30)).toBe('oversold')
    expect(rsiZone(50)).toBe('neutral')
    expect(rsiZone(null)).toBeNull()
  })
})

describe('stochastic', () => {
  it('places close at the top and bottom of its range', () => {
    const rising = candlesFromCloses([1, 2, 3, 4, 5])
    expect(last(stochastic(rising, 5, 3).k)).toBeCloseTo(100, 6)

    const falling = candlesFromCloses([5, 4, 3, 2, 1])
    expect(last(stochastic(falling, 5, 3).k)).toBeCloseTo(0, 6)
  })

  it('returns 50 when the window is completely flat instead of NaN', () => {
    const flat = candlesFromCloses([3, 3, 3, 3, 3])
    const result = stochastic(flat, 5, 3)
    expect(result.k[4]).toBe(50)
  })

  it('computes %K at the midpoint of a known range', () => {
    // window low 10, high 20, close 15 -> (15-10)/(20-10) = 50%
    const candles: Candle[] = [
      { date: '2024-01-01', open: 10, high: 20, low: 10, close: 12, volume: 1 },
      { date: '2024-01-02', open: 12, high: 18, low: 12, close: 16, volume: 1 },
      { date: '2024-01-03', open: 16, high: 19, low: 14, close: 15, volume: 1 },
    ]
    expect(stochastic(candles, 3, 3).k[2]).toBeCloseTo(50, 6)
  })
})

describe('roc', () => {
  it('computes percentage change over the lookback', () => {
    // index 2 vs index 0: (120-100)/100 = 20%
    expect(roc([100, 110, 120], 2)[2]).toBeCloseTo(20, 10)
  })

  it('skips a zero reference rather than dividing by it', () => {
    expect(roc([0, 5, 10], 2)[2]).toBeNull()
  })
})

describe('trueRange', () => {
  it('uses high-low on the first bar, which has no previous close', () => {
    const candles: Candle[] = [
      { date: '2024-01-01', open: 10, high: 12, low: 9, close: 11, volume: 1 },
    ]
    expect(trueRange(candles)).toEqual([3])
  })

  it('captures an overnight gap that high-low alone would miss', () => {
    // Bar 2 trades 20..22 after closing at 11 -> true range is 22-11 = 11,
    // far larger than its own 2-point high-low span.
    const candles: Candle[] = [
      { date: '2024-01-01', open: 10, high: 12, low: 9, close: 11, volume: 1 },
      { date: '2024-01-02', open: 20, high: 22, low: 20, close: 21, volume: 1 },
    ]
    expect(trueRange(candles)[1]).toBe(11)
  })
})

describe('atr', () => {
  it('equals the mean true range over the seed window', () => {
    const candles: Candle[] = Array.from({ length: 5 }, (_, i) => ({
      date: `2024-01-0${i + 1}`,
      open: 10,
      high: 12,
      low: 10,
      close: 11,
      volume: 1,
    }))
    // Bar 0 TR = 2 (high-low). Bars 1-4: max(2, |12-11|, |10-11|) = 2.
    // Seed over period 3 = 2, and it stays 2.
    expect(last(atr(candles, 3))).toBeCloseTo(2, 10)
  })

  it('returns all nulls when history is shorter than the period', () => {
    const candles = candlesFromCloses([1, 2])
    expect(atr(candles, 14).every((v) => v === null)).toBe(true)
  })
})

describe('bollinger', () => {
  it('matches the textbook population-stdev example', () => {
    // [2,4,4,4,5,5,7,9] -> mean 5, population stdev 2
    // upper = 5 + 2*2 = 9 ; lower = 5 - 2*2 = 1
    const result = bollinger([2, 4, 4, 4, 5, 5, 7, 9], 8, 2)
    expect(result.middle[7]).toBeCloseTo(5, 10)
    expect(result.upper[7]).toBeCloseTo(9, 10)
    expect(result.lower[7]).toBeCloseTo(1, 10)
    expect(result.bandwidth[7]).toBeCloseTo(8 / 5, 10)
  })

  it('collapses the bands to the mean for a flat series', () => {
    const result = bollinger([5, 5, 5, 5, 5], 5, 2)
    expect(result.upper[4]).toBeCloseTo(5, 10)
    expect(result.lower[4]).toBeCloseTo(5, 10)
    expect(result.bandwidth[4]).toBeCloseTo(0, 10)
  })
})

describe('stdev', () => {
  it('computes population standard deviation', () => {
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 10)
  })

  it('returns 0 for identical values and for an empty array', () => {
    expect(stdev([3, 3, 3])).toBe(0)
    expect(stdev([])).toBe(0)
  })
})

describe('rangePosition', () => {
  it('returns null rather than a misleading partial range', () => {
    // A 30-bar listing has no 52-week range. Reporting its 30-bar range as one
    // would be actively wrong, so we refuse.
    const candles = candlesFromCloses(Array.from({ length: 30 }, (_, i) => 100 + i))
    expect(rangePosition(candles, 252)).toBeNull()
  })

  it('locates the close within the window', () => {
    const candles = candlesFromCloses([10, 20, 30, 20, 15])
    const result = rangePosition(candles, 5)
    expect(result).not.toBeNull()
    expect(result!.high).toBe(30)
    expect(result!.low).toBe(10)
    expect(result!.positionPct).toBeCloseTo(25, 6) // (15-10)/(30-10)
  })

  it('nulls the position when the window is flat', () => {
    const candles = candlesFromCloses([5, 5, 5])
    expect(rangePosition(candles, 3)!.positionPct).toBeNull()
  })
})

describe('returnVolatility', () => {
  it('is zero for a constant series', () => {
    expect(returnVolatility([10, 10, 10, 10])).toBeCloseTo(0, 10)
  })

  it('returns null with too few points', () => {
    expect(returnVolatility([10])).toBeNull()
  })
})
