import { formatCurrency, formatPercent, directionGlyph, direction } from '../lib/format.ts'

/**
 * Dashboard — the design reference for the rest of the app.
 *
 * Demonstrates the two conventions everything else follows:
 *   1. `.numeric` (tabular figures) on every price, so digits do not jitter.
 *   2. Direction encoded in BOTH colour and an arrow glyph, so red/green is
 *      never the sole carrier of meaning.
 *
 * Figures are placeholders until portfolios are wired in Phase 2.
 */

const PLACEHOLDER = {
  totalValue: 128_450.32,
  dayChangePct: 1.24,
  dayChangeValue: 1_572.18,
}

function Stat({
  label,
  value,
  changePct,
}: {
  label: string
  value: string
  changePct?: number | null
}) {
  const dir = direction(changePct)
  const tone =
    dir === 'up' ? 'text-(--color-gain)' : dir === 'down' ? 'text-(--color-loss)' : 'text-(--color-ink-muted)'

  return (
    <div className="rounded-2xl border border-(--color-border-subtle) bg-(--color-surface) p-5">
      <p className="text-sm text-(--color-ink-muted)">{label}</p>
      <p className="numeric mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {changePct !== undefined && (
        <p className={`numeric mt-1 text-sm ${tone}`}>
          <span aria-hidden>{directionGlyph(changePct)}</span> {formatPercent(changePct)}
        </p>
      )}
    </div>
  )
}

export default function Dashboard() {
  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Prices are delayed on free data tiers — every figure carries an “as of” stamp once live.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Total value"
          value={formatCurrency(PLACEHOLDER.totalValue)}
          changePct={PLACEHOLDER.dayChangePct}
        />
        <Stat label="Day change" value={formatCurrency(PLACEHOLDER.dayChangeValue)} />
        <Stat label="Positions" value="—" />
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-(--color-border-subtle) bg-(--color-surface) p-8">
        <p className="text-sm text-(--color-ink-muted)">
          Allocation breakdown, top movers and the unread-alert count arrive in{' '}
          <span className="font-medium">Phase 2</span>, once portfolios and the quote
          pipeline are connected.
        </p>
      </div>
    </section>
  )
}
