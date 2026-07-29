/**
 * Shown when Supabase env vars are absent.
 *
 * Deliberately a real screen rather than a thrown error: on a fresh clone the
 * app should tell you what to do, not hand you a blank page and a stack trace.
 */
export default function SetupRequired() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-(--color-border-subtle) bg-(--color-surface) p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Setup required</h1>
        <p className="mt-2 text-sm text-(--color-ink-muted)">
          Supabase is not configured yet, so there is nothing to sign in to.
        </p>

        <ol className="mt-6 space-y-3 text-sm">
          <li>
            <span className="font-medium">1.</span> Create a free project at{' '}
            <a
              className="text-(--color-brand) underline underline-offset-2"
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer noopener"
            >
              supabase.com/dashboard
            </a>
          </li>
          <li>
            <span className="font-medium">2.</span> Copy{' '}
            <code className="rounded bg-(--color-surface-muted) px-1.5 py-0.5 text-xs">.env.example</code>{' '}
            to{' '}
            <code className="rounded bg-(--color-surface-muted) px-1.5 py-0.5 text-xs">.env.local</code>
          </li>
          <li>
            <span className="font-medium">3.</span> Fill in{' '}
            <code className="rounded bg-(--color-surface-muted) px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code>{' '}
            and{' '}
            <code className="rounded bg-(--color-surface-muted) px-1.5 py-0.5 text-xs">
              VITE_SUPABASE_ANON_KEY
            </code>{' '}
            from Project Settings → API
          </li>
          <li>
            <span className="font-medium">4.</span> Apply the migrations in{' '}
            <code className="rounded bg-(--color-surface-muted) px-1.5 py-0.5 text-xs">
              supabase/migrations/
            </code>
          </li>
          <li>
            <span className="font-medium">5.</span> Restart the dev server
          </li>
        </ol>

        <p className="mt-6 rounded-lg bg-(--color-surface-muted) p-3 text-xs text-(--color-ink-muted)">
          The anon key is safe to expose — it ships in the built bundle by design.
          Row Level Security is the actual boundary. Never put a service-role key
          in a <code>VITE_</code> variable; it bypasses RLS entirely.
        </p>
      </div>
    </div>
  )
}
