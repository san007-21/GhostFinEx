import { createClient } from '@supabase/supabase-js'

/**
 * Single Supabase client for the whole app.
 *
 * Credentials come from Vite env vars (frontend/.env / .env.local):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY — or its newer name, VITE_SUPABASE_PUBLISHABLE_KEY
 *     (Supabase renamed the public "anon" key to "publishable"; both work
 *     identically in supabase-js v2, so this client accepts either).
 *
 * Only the public anon/publishable key is used — never a service_role key,
 * which must stay on a server. When the variables are absent the app stays
 * fully functional in local demo mode (see isSupabaseConfigured below).
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(
  typeof supabaseUrl === 'string' && supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 0,
)

/** Client instance; null in unconfigured/demo-only environments. */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/** Dev-only diagnostics. The anon key is never logged. */
if (import.meta.env.DEV) {
  console.info(isSupabaseConfigured ? '[ghostfinex] Supabase configured.' : '[ghostfinex] Supabase not configured — running in local demo mode.')
}
