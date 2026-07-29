import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth.tsx'

export default function Settings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/auth', { replace: true })
  }

  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <div className="rounded-2xl border border-(--color-border-subtle) bg-(--color-surface) p-5">
        <h2 className="text-sm font-medium">Account</h2>
        <p className="mt-1 text-sm text-(--color-ink-muted)">{user?.email ?? '—'}</p>
        {/* Also the only sign-out route on mobile, where there is no sidebar. */}
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 flex items-center gap-2 rounded-lg border border-(--color-border-subtle) px-3 py-2 text-sm text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-muted)"
        >
          <LogOut size={16} aria-hidden />
          Sign out
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-(--color-border-subtle) bg-(--color-surface) p-8">
        <p className="text-sm text-(--color-ink-muted)">
          Country, base currency, timezone (quiet hours are evaluated in it),
          notification channel setup and push permission arrive in{' '}
          <span className="font-medium">Phases 2–4</span>.
        </p>
        <p className="mt-3 text-sm text-(--color-ink-muted)">
          On iPhone, Web Push only works after Share → Add to Home Screen — in a plain
          Safari tab <code>PushManager</code> does not exist. Telegram is the recommended
          primary channel for that reason.
        </p>
      </div>
    </section>
  )
}
