import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './context.js'
import { friendlyAuthError } from './authErrors'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Authentication provider — Supabase Auth (Phase 6).
 *
 * The consumer-facing interface is unchanged from the earlier prototype:
 *   { user, session, isDemo, signIn, signUp, signOut, exitDemo }
 *
 * Behavior:
 * - signIn  → supabase.auth.signInWithPassword; Supabase's rejection IS the
 *   error thrown here (no fake success, no setTimeout pretense).
 * - signUp  → supabase.auth.signUp; display name goes into user metadata and
 *   is persisted to profiles by the DB trigger (with a client-side fallback
 *   in ensureProfile if the trigger is absent).
 * - signOut → supabase.auth.signOut.
 * - Session restore after reload comes from Supabase's persisted session via
 *   onAuthStateChange; nothing is invented locally.
 * - Demo mode (isDemo) means "no Supabase session". It never writes to
 *   Supabase and never pretends to be an authenticated user (Phase 7).
 * - When Supabase env vars are absent, the app still boots in demo mode so
 *   the local prototype remains usable.
 */
const DEMO_USER = Object.freeze({
  id: 'demo',
  email: null,
  displayName: 'Demo Student',
  isDemo: true,
})

/**
 * Supabase's rejection IS the error thrown here — run through the friendly
 * mapper so students get an explanation and a next step, never raw jargon,
 * and never a fake success (see auth/authErrors.js).
 */
function authError(error) {
  return new Error(friendlyAuthError(error))
}

export function AuthProvider({ children }) {
  // null = still restoring; DEMO_USER = no session; user object = signed in.
  const [user, setUser] = useState(isSupabaseConfigured ? null : DEMO_USER)
  const [restoring, setRestoring] = useState(isSupabaseConfigured)
  const [signUpMessage, setSignUpMessage] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    let cancelled = false
    let mounted = true

    // Restore any existing session first (survives reload).
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled || !mounted) return
        if (error) {
          setUser(DEMO_USER)
        } else if (data?.session?.user) {
          const u = data.session.user
          setUser({
            id: u.id,
            email: u.email ?? null,
            displayName: u.user_metadata?.display_name || u.email?.split('@')[0] || 'Student',
            isDemo: false,
          })
        } else {
          setUser(DEMO_USER)
        }
        setRestoring(false)
      })
      .catch(() => {
        if (!cancelled && mounted) {
          setUser(DEMO_USER)
          setRestoring(false)
        }
      })

    // Keep auth state in sync (sign-in from another tab, token refresh, etc).
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT') {
        setUser(DEMO_USER)
        return
      }
      const u = session?.user
      if (u) {
        setUser({
          id: u.id,
          email: u.email ?? null,
          displayName: u.user_metadata?.display_name || u.email?.split('@')[0] || 'Student',
          isDemo: false,
        })
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setUser(DEMO_USER)
      }
    })

    return () => {
      cancelled = true
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const value = useMemo(() => {
    const session = user && !user.isDemo
      ? { user, provider: 'supabase', createdAt: new Date().toISOString() }
      : null

    const requireClient = () => {
      if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.')
    }

    return {
      user,
      session,
      isDemo: !user || user.isDemo,
      demoUser: DEMO_USER,
      restoring,
      authReady: !restoring,
      signUpMessage,
      clearSignUpMessage: () => setSignUpMessage(''),

      signIn: async (email, password) => {
        requireClient()
        if (!email || !email.includes('@')) throw new Error('That email address doesn\'t look right — please check it for typos.')
        if (!password || password.length < 6) throw new Error('Please enter your password (at least 6 characters).')
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw authError(error)
        const u = data.user
        setUser({
          id: u.id,
          email: u.email ?? null,
          displayName: u.user_metadata?.display_name || u.email?.split('@')[0] || 'Student',
          isDemo: false,
        })
        return data
      },

      signUp: async (email, password, displayName) => {
        requireClient()
        if (!email || !email.includes('@')) throw new Error('That email address doesn\'t look right — please check it for typos.')
        if (!password || password.length < 6) throw new Error('Please choose a password with at least 6 characters — it protects your financial data.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split('@')[0] },
          },
        })
        if (error) throw authError(error)
        // Supabase may require email confirmation: no session yet, user exists.
        if (data.session) {
          const u = data.user
          setUser({
            id: u.id,
            email: u.email ?? null,
            displayName: u.user_metadata?.display_name || u.email?.split('@')[0] || 'Student',
            isDemo: false,
          })
        } else {
          setSignUpMessage('Check your inbox to confirm your email address, then sign in.')
        }
        return data
      },

      signOut: async () => {
        if (!supabase) {
          setUser(DEMO_USER)
          return
        }
        const { error } = await supabase.auth.signOut()
        if (error) throw authError(error)
        setUser(DEMO_USER)
      },

      // Kept for interface compatibility: leaving demo = plain demo state.
      exitDemo: () => setUser(DEMO_USER),
    }
  }, [user, restoring, signUpMessage])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
