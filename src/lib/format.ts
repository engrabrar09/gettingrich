/**
 * Single source of truth for rendering numbers.
 *
 * The recurring rule here: `null` means "insufficient history" and must render
 * as an em dash, never as 0. A freshly listed ticker legitimately has no SMA
 * 200 for its first 200 sessions, and showing 0 there reads as a total price
 * collapse. Every formatter takes `number | null` for exactly this reason.
 */

export const NO_DATA = '—'

export function formatCurrency(
  value: number | null | undefined,
  currency = 'USD',
  locale = 'en-US',
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NO_DATA
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    // Sub-dollar assets need more precision than blue chips.
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(value) < 1 ? 6 : 2,
  }).format(value)
}

export function formatNumber(
  value: number | null | undefined,
  fractionDigits = 2,
  locale = 'en-US',
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NO_DATA
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** Percentages carry an explicit sign so direction survives without colour. */
export function formatPercent(
  value: number | null | undefined,
  fractionDigits = 2,
  locale = 'en-US',
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NO_DATA
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay: 'exceptZero',
  }).format(value)
  return `${formatted}%`
}

/** Compact form for volume and market cap: 1.2M, 3.4B. */
export function formatCompact(value: number | null | undefined, locale = 'en-US'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NO_DATA
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export type Direction = 'up' | 'down' | 'flat'

export function direction(value: number | null | undefined): Direction {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) return 'flat'
  return value > 0 ? 'up' : 'down'
}

/**
 * Arrow glyph paired with every gain/loss colour.
 *
 * Red/green alone is the most common colour-vision deficiency, so direction is
 * always encoded redundantly in shape as well as hue.
 */
export function directionGlyph(value: number | null | undefined): string {
  const d = direction(value)
  return d === 'up' ? '▲' : d === 'down' ? '▼' : '·'
}

/**
 * "as of" stamps. Free-tier quotes are delayed, and hiding that would
 * misrepresent the data, so every price in the UI carries one.
 */
export function formatAsOf(iso: string | null | undefined, locale = 'en-US'): string {
  if (!iso) return NO_DATA
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return NO_DATA
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}
