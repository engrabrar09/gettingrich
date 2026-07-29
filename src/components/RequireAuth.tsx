import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'

/**
 * Route guard.
 *
 * Two details that are easy to get wrong:
 *
 * 1. While `loading` is true we render a neutral screen rather than
 *    redirecting. Supabase restores the session asynchronously, so redirecting
 *    early bounces a signed-in user to /auth on every hard refresh.
 *
 * 2. The attempted path is stashed in navigation state so sign-in can return
 *    there. Without it, following a link to /notifications while logged out
 *    dumps you on the dashboard after signing in.
 *
 * This is a convenience boundary, not a security one — RLS is what actually
 * protects the data. Bypassing this component reveals empty pages, not data.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div
        className="flex min-h-full items-center justify-center p-8 text-sm text-(--color-ink-muted)"
        role="status"
        aria-live="polite"
      >
        Checking session…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}
