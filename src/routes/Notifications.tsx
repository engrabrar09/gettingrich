import { useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'

/**
 * Notification centre with the New / Read separation.
 *
 * Data model note (see supabase/migrations): unread is `read_at IS NULL`, and
 * the query is served by the composite index on
 * (user_id, read_at, created_at desc).
 *
 * The rows below are STATIC SAMPLES so the layout and empty states can be
 * reviewed before the alert engine exists. Wiring to Supabase — plus the
 * Realtime subscription that drives the nav badge — is Phase 4.
 */

type Tab = 'new' | 'read'

interface SampleNotification {
  id: string
  title: string
  body: string
  severity: 'info' | 'warning' | 'critical'
  createdAt: string
  readAt: string | null
}

const SAMPLES: SampleNotification[] = [
  {
    id: '1',
    title: 'AAPL crossed above SMA 50',
    body: 'Price 214.30 crossed its 50-day moving average of 211.88.',
    severity: 'info',
    createdAt: '2026-07-29T13:05:00Z',
    readAt: null,
  },
  {
    id: '2',
    title: 'XAU RSI entered oversold',
    body: 'RSI(14) crossed below 30, now 28.4.',
    severity: 'warning',
    createdAt: '2026-07-29T09:40:00Z',
    readAt: null,
  },
  {
    id: '3',
    title: 'BTC volume spike',
    body: 'Volume 3.2x its 20-day average.',
    severity: 'info',
    createdAt: '2026-07-28T18:12:00Z',
    readAt: '2026-07-28T19:00:00Z',
  },
]

const SEVERITY_STYLES: Record<SampleNotification['severity'], string> = {
  info: 'bg-(--color-brand)/10 text-(--color-brand)',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  critical: 'bg-(--color-loss)/15 text-(--color-loss)',
}

export default function Notifications() {
  const [tab, setTab] = useState<Tab>('new')

  const unread = SAMPLES.filter((n) => n.readAt === null)
  const read = SAMPLES.filter((n) => n.readAt !== null)
  const shown = tab === 'new' ? unread : read

  return (
    <section>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            Every alert is recorded here even if delivery to Telegram, push or email fails.
          </p>
        </div>
        {unread.length > 0 && (
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-(--color-border-subtle) px-3 py-1.5 text-sm text-(--color-ink-muted) hover:bg-(--color-surface)"
          >
            <CheckCheck size={16} aria-hidden />
            Mark all read
          </button>
        )}
      </header>

      <div
        role="tablist"
        aria-label="Notification status"
        className="mb-4 flex gap-1 rounded-xl bg-(--color-surface) p-1"
      >
        {(
          [
            ['new', 'New', unread.length],
            ['read', 'Read', read.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={[
              'flex-1 rounded-lg px-4 py-2 text-sm transition-colors',
              tab === value
                ? 'bg-(--color-brand)/10 font-medium text-(--color-brand)'
                : 'text-(--color-ink-muted) hover:bg-(--color-surface-muted)',
            ].join(' ')}
          >
            {label}
            <span className="ml-2 text-xs opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-(--color-border-subtle) bg-(--color-surface) p-12 text-center">
          <Bell size={28} className="mx-auto mb-3 text-(--color-ink-muted)" aria-hidden />
          <p className="text-sm text-(--color-ink-muted)">
            {tab === 'new' ? 'Nothing new. Alerts land here when a rule fires.' : 'No read alerts yet.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((n) => (
            <li
              key={n.id}
              className="rounded-2xl border border-(--color-border-subtle) bg-(--color-surface) p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 rounded-md px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[n.severity]}`}
                >
                  {n.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-1 text-sm text-(--color-ink-muted)">{n.body}</p>
                  <time
                    className="mt-2 block text-xs text-(--color-ink-muted)"
                    dateTime={n.createdAt}
                  >
                    {new Date(n.createdAt).toLocaleString()}
                  </time>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 rounded-lg bg-(--color-surface) p-3 text-xs text-(--color-ink-muted)">
        Sample data. Live notifications, the unread badge and per-channel delivery
        status arrive in Phase 4.
      </p>
    </section>
  )
}
