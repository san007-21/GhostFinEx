import { useState } from 'react'
import Card from '../components/ui/Card.jsx'
import { Alert, Button, Disclaimer, TextField } from '../components/ui/Primitives.jsx'
import { useAuth } from '../auth/useAuth.js'
import { isSupabaseConfigured } from '../lib/supabase'
import { IconGhost } from '../components/ui/icons.jsx'

/**
 * Account / sign-in UI. Backed by real Supabase Auth when configured; when
 * the env vars are absent the view explains how to enable it and the app
 * continues to work in demo mode.
 */
export default function AuthView({ onNavigate }) {
  const auth = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        await auth.signIn(email, password)
      } else {
        await auth.signUp(email, password, displayName)
      }
      onNavigate('dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const continueAsDemo = () => {
    auth.exitDemo()
    onNavigate('dashboard')
  }

  const signOut = () => {
    auth.signOut()
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)]">
          <IconGhost className="h-6 w-6 text-[var(--gfx-accent)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--gfx-text)]">
          {auth.isDemo ? 'You are browsing as a guest' : `Signed in as ${auth.user?.displayName}`}
        </h2>
        <p className="mt-1 text-sm text-[var(--gfx-muted)]">
          {auth.isDemo
            ? 'Demo data stays in this browser. Sign in to keep your finances in sync.'
            : 'Your data is stored in your own private account.'}
        </p>
      </div>

      {!isSupabaseConfigured && (
        <div className="mb-4">
          <Alert tone="info" title="Authentication is not configured on this build">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your
            environment (see <code>.env.example</code>) to enable real accounts. Demo mode keeps
            working meanwhile.
          </Alert>
        </div>
      )}

      {auth.isDemo ? (
        <Card title={mode === 'signin' ? 'Sign in' : 'Create an account'} subtitle="Your financial records belong only to your account">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-1" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => switchMode('signin')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-[var(--gfx-surface)] text-[var(--gfx-text)] shadow-sm' : 'text-[var(--gfx-muted)] hover:text-[var(--gfx-text)]'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => switchMode('signup')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-[var(--gfx-surface)] text-[var(--gfx-text)] shadow-sm' : 'text-[var(--gfx-muted)] hover:text-[var(--gfx-text)]'}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <TextField label="Display name" value={displayName} onChange={setDisplayName} placeholder="e.g. Thandi" autoComplete="name" />
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Email</span>
              <input
                type="email"
                className="w-full rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-sm text-[var(--gfx-text)] placeholder:text-[var(--gfx-faint)] focus:border-[var(--gfx-accent-strong)] focus:outline-none transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Password</span>
              <input
                type="password"
                className="w-full rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-sm text-[var(--gfx-text)] placeholder:text-[var(--gfx-faint)] focus:border-[var(--gfx-accent-strong)] focus:outline-none transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </label>
            {error && (
              <Alert tone="danger" title="That didn't work">{error}</Alert>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-[var(--gfx-faint)]">
            <span className="h-px flex-1 bg-[var(--gfx-border)]" />
            or
            <span className="h-px flex-1 bg-[var(--gfx-border)]" />
          </div>

          <Button variant="secondary" size="lg" className="w-full" onClick={continueAsDemo}>
            Continue in demo mode
          </Button>
        </Card>
      ) : (
        <Card title="Your session" subtitle="Authenticated with Supabase">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--gfx-muted)]">Name</dt>
              <dd className="font-medium text-[var(--gfx-text)]">{auth.user?.displayName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--gfx-muted)]">Email</dt>
              <dd className="font-medium text-[var(--gfx-text)]">{auth.user?.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--gfx-muted)]">Provider</dt>
              <dd><span className="text-[var(--gfx-muted)]">supabase</span></dd>
            </div>
          </dl>
          <div className="mt-5 flex justify-end">
            <Button variant="secondary" onClick={signOut}>Sign out</Button>
          </div>
        </Card>
      )}

      <div className="mt-6">
        <Disclaimer>
          Only the public Supabase anon key is used in this app. Passwords are verified by
          Supabase Auth — they are never stored, logged, or processed by GhostFinEx itself.
        </Disclaimer>
      </div>
    </div>
  )
}
