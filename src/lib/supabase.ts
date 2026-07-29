import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase browser client.
 *
 * The anon key is PUBLIC by design — it ships inside the built JS bundle and
 * anyone can read it. That is fine and expected: Row Level Security is the
 * actual boundary, not the key. Never put a service-role key here; it bypasses
 * RLS entirely and would expose every user's data.
 *
 * Configuration is treated as optional at import time on purpose. Throwing here
 * would make `npm run dev` fail with a blank page before Supabase is even set
 * up; instead the app renders a setup screen. See `isSupabaseConfigured`.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

let client: SupabaseClient | null = null
if (isSupabaseConfigured) {
  client = createClient(url!, anonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

/**
 * Get the client, or throw with an actionable message.
 * Guard with `isSupabaseConfigured` before calling in render paths.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and set ' +
        'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  return client
}
