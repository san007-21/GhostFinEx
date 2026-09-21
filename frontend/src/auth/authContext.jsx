import { useMemo, useState } from 'react'
import { AuthContext } from './context.js'

/**
 * Mock authentication provider — UI ONLY for this frontend phase.
 *
 * There is no Supabase, no server, no real credential check: any valid-looking
 * email and any password (≥ 6 chars, checked client-side for UX messaging
 * only) signs in. When Supabase Auth is introduced later, replace the bodies
 * of signIn/signUp/signOut with real calls — every consumer keeps using the
 * same shape: { user, session, isDemo, signIn, signUp, signOut, exitDemo }.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const value = useMemo(() => {
    const session = user
      ? { user, provider: 'mock', createdAt: new Date().toISOString() }
      : null
    const makeUser = (email, displayName) => ({
      id: email ? `mock-${email.toLowerCase()}` : 'mock-demo',
      email: email || null,
      displayName: displayName || (email ? email.split('@')[0] : 'Demo Student'),
      isDemo: !email,
    })
    return {
      user,
      session,
      isDemo: user === null,
      demoUser: makeUser(''),
      signIn: async (email, password) => {
        if (!email || !email.includes('@')) throw new Error('Enter a valid email address.')
        if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.')
        await new Promise((resolve) => setTimeout(resolve, 250))
        setUser(makeUser(email))
      },
      signUp: async (email, password, displayName) => {
        if (!email || !email.includes('@')) throw new Error('Enter a valid email address.')
        if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.')
        await new Promise((resolve) => setTimeout(resolve, 250))
        setUser(makeUser(email, displayName))
      },
      signOut: () => setUser(null),
      exitDemo: () => setUser(null),
    }
  }, [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
