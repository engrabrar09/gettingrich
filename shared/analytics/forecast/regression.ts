/**
 * Least-squares trend fitting and forward projection.
 *
 * Everything here assumes the trend continues, which is precisely what fails at
 * turning points. That is why `r2` is part of the return type rather than an
 * internal detail: a projection without its R-squared is not a result, it is a
 * decoration. The UI is required to render them together.
 */

export interface RegressionResult {
  /** Change in y per one-bar step. */
  slope: number
  intercept: number
  /**
   * Coefficient of determination, 0..1.
   * Null when the series has zero variance — a flat line has nothing to explain,
   * and reporting 1.0 there would imply a perfectly predictive trend.
   */
  r2: number | null
  /** Standard deviation of residuals — the width unit for projection bands. */
  residualStdev: number
  /** Number of points the fit was computed over. */
  n: number
}

/** Ordinary least squares of y against its own index. Null if fewer than 2 points. */
export function linearRegression(values: number[]): RegressionResult | null {
  const n = values.length
  if (n < 2) return null

  let sumX = 0
  let sumY = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
  }
  const meanX = sumX / n
  const meanY = sumY / n

  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    const dx = i - meanX
    sxy += dx * (values[i] - meanY)
    sxx += dx * dx
  }
  if (sxx === 0) return null

  const slope = sxy / sxx
  const intercept = meanY - slope * meanX

  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept
    const dRes = values[i] - predicted
    const dTot = values[i] - meanY
    ssRes += dRes * dRes
    ssTot += dTot * dTot
  }

  return {
    slope,
    intercept,
    r2: ssTot === 0 ? null : 1 - ssRes / ssTot,
    residualStdev: Math.sqrt(ssRes / n),
    n,
  }
}

/**
 * Log-linear fit — a straight line through ln(price), i.e. constant compound
 * growth. Usually the better model for equities and crypto over long windows.
 *
 * Returns null if any value is <= 0, since ln is undefined there. Do not
 * substitute a floor: silently clamping prices changes the model.
 */
export function logLinearRegression(values: number[]): RegressionResult | null {
  for (const v of values) {
    if (v <= 0 || !Number.isFinite(v)) return null
  }
  return linearRegression(values.map(Math.log))
}

export interface ProjectionPoint {
  /** Bars beyond the last observed value; 1 = next bar. */
  step: number
  value: number
  lower: number
  upper: number
}

/**
 * Extend a fitted line forward with a residual-derived band.
 *
 * `zScore` defaults to 1.96 (~95% under a normal residual assumption). The band
 * reflects scatter around the historical fit only — it does NOT account for the
 * trend itself breaking, which is the dominant real-world risk.
 */
export function project(
  fit: RegressionResult,
  horizon: number,
  options: { logSpace?: boolean; zScore?: number } = {},
): ProjectionPoint[] {
  const { logSpace = false, zScore = 1.96 } = options
  const out: ProjectionPoint[] = []
  const halfWidth = zScore * fit.residualStdev

  for (let step = 1; step <= horizon; step++) {
    const x = fit.n - 1 + step
    const centre = fit.slope * x + fit.intercept
    const lo = centre - halfWidth
    const hi = centre + halfWidth
    out.push(
      logSpace
        ? { step, value: Math.exp(centre), lower: Math.exp(lo), upper: Math.exp(hi) }
        : { step, value: centre, lower: lo, upper: hi },
    )
  }
  return out
}

/**
 * Slope expressed as an annualised percentage, so trends are comparable across
 * assets and window lengths. `barsPerYear` defaults to 252 US trading days;
 * pass 365 for crypto and metals, which trade continuously.
 */
export function annualisedSlopePct(
  fit: RegressionResult,
  lastValue: number,
  barsPerYear = 252,
  logSpace = false,
): number | null {
  if (logSpace) return (Math.exp(fit.slope * barsPerYear) - 1) * 100
  if (lastValue === 0 || !Number.isFinite(lastValue)) return null
  return ((fit.slope * barsPerYear) / lastValue) * 100
}
