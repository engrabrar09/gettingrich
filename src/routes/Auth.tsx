import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'

type Mode = 'signin' | 'signup'

// Supabase's default minimum. Enforced here too so the user gets an inline
// message instead of a round-trip and a raw API error string.
const MIN_PASSWORD_LENGTH = 6

export default function Auth() {
  const { session, loading, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)

  // Where to land after signing in — set by RequireAuth when it bounced us here.
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-sm text-(--color-ink-muted)">
        Checking session…
      </div>
    )
  }

  // Already signed in — no reason to show the form.
  if (session) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error)
          return
        }
        navigate(from, { replace: true })
      } else {
        const { error, needsEmailConfirmation } = await signUp(email, password)
        if (error) {
          setError(error)
          return
        }
        // With confirmation enabled there is no session yet, so navigating
        // would just bounce back here. Show the check-your-email state instead.
        if (needsEmailConfirmation) {
          setConfirmationSent(true)
          return
        }
        navigate(from, { replace: true })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmationSent) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-(--color-border-subtle) bg-(--color-surface) p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-3 text-sm text-(--color-ink-muted)">
            We sent a confirmation link to <span className="font-medium">{email}</span>. Click
            it, then come back and sign in.
          </p>
          <p className="mt-4 rounded-lg bg-(--color-surface-muted) p-3 text-xs text-(--color-ink-muted)">
            Nothing arrived? Supabase's built-in email service is rate-limited to a few
            messages per hour and can be slow. Check spam before retrying.
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirmationSent(false)
              setMode('signin')
              setPassword('')
            }}
            className="mt-6 text-sm text-(--color-brand) underline underline-offset-2"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-(--color-border-subtle) bg-(--color-surface) p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          {mode === 'signin'
            ? 'Welcome back.'
            : 'Your portfolios are private to your account.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-(--color-border-subtle) bg-(--color-surface) px-3 py-2 text-sm outline-none focus:border-(--color-brand)"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              // Tells password managers whether to offer save vs autofill.
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-(--color-border-subtle) bg-(--color-surface) px-3 py-2 text-sm outline-none focus:border-(--color-brand)"
            />
            {mode === 'signup' && (
              <p className="mt-1 text-xs text-(--color-ink-muted)">
                At least {MIN_PASSWORD_LENGTH} characters. Use a password manager.
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-(--color-loss)/10 px-3 py-2 text-sm text-(--color-loss)"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-(--color-brand) px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-(--color-ink-muted)">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
            }}
            className="text-(--color-brand) underline underline-offset-2"
          >
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </p>

        {/* Google sign-in is additive — Supabase supports both at once, so this
            becomes one more button rather than a migration. */}
        <p className="mt-4 border-t border-(--color-border-subtle) pt-4 text-center text-xs text-(--color-ink-muted)">
          Google sign-in coming later.
        </p>
      </div>
    </div>
  )
}
