import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase } from './supabase.ts'

/**
 * Session state for the whole app.
 *
 * `loading` exists to prevent a login-screen flash. Supabase restores the
 * session from storage asynchronously, so on first paint we genuinely do not
 * know whether the user is signed in. Rendering the guard before that resolves
 * would bounce an already-authenticated user to /auth on every hard refresh.
 */

export interface AuthResult {
  error: string | null
  /** Sign-up only: true when Supabase sent a confirmation email. */
  needsEmailConfirmation?: boolean
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    // Fires on sign-in, sign-out, token refresh, and across browser tabs.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,

      async signIn(email, password) {
        const { error } = await getSupabase().auth.signInWithPassword({ email, password })
        return { error: error?.message ?? null }
      },

      async signUp(email, password) {
        const { data, error } = await getSupabase().auth.signUp({ email, password })
        if (error) return { error: error.message }

        // With email confirmation ON, Supabase returns a user but NO session.
        // Distinguishing these matters: otherwise the UI reports success and
        // then silently fails to navigate, because there is nothing to
        // authenticate with yet.
        return { error: null, needsEmailConfirmation: !data.session }
      },

      async signOut() {
        await getSupabase().auth.signOut()
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
