import { Component, Suspense, lazy, useCallback, useEffect, useState } from 'react'
import './App.css'
import { useFinanceState } from './hooks/useFinanceState'
import { AuthProvider } from './auth/authContext.jsx'
import { useAuth } from './auth/useAuth.js'
import { Disclaimer, SkeletonCard } from './components/ui/Primitives.jsx'
import Sidebar from './components/nav/Sidebar.jsx'
import TopBar from './components/nav/TopBar.jsx'
import MobileMenu from './components/nav/MobileMenu.jsx'
import BottomNav from './components/nav/BottomNav.jsx'
import GhostAssistant from './components/GhostAssistant.jsx'
import LandingView from './views/LandingView.jsx'
import { NAV_ITEMS } from './components/nav/navItems.js'

/**
 * Route-level code splitting: each view ships as its own chunk and loads on
 * first navigation, cutting the initial bundle roughly in half (React and the
 * Supabase client stay in the entry — the app cannot boot without them).
 * All views share the same props contract, so laziness is invisible to them.
 */
const LazyViews = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.id, lazy(item.load)]),
)

/** Hash → view id resolution (unchanged behavior). */
function knownViewFromHash() {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'landing') return 'landing'
  if (NAV_ITEMS.some((item) => item.id === hash)) return hash
  return null
}

/**
 * Render-crash containment: a broken view must never white-screen the whole
 * app. The boundary shows an actionable recovery panel and keeps the shell
 * (sidebar, top bar, Ghost) alive, so the failure is always recoverable.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Developer-facing detail only; never shown to the user.
    console.error('[ghostfinex] view crashed:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg py-16 text-center">
          <h2 className="text-lg font-semibold text-[var(--gfx-text)]">This view hit a snag</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--gfx-muted)]">
            Something went wrong while rendering this page. Your data is safe — nothing was
            changed. Try reopening the view, or head back to the dashboard.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-1.5 text-sm font-medium text-[var(--gfx-text)] hover:border-[var(--gfx-border-strong)]"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.props.onNavigateDashboard}
              className="rounded-lg bg-[var(--gfx-accent-strong)] px-3 py-1.5 text-sm font-medium text-[var(--gfx-accent-ink)] hover:bg-[var(--gfx-accent)]"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/** Suspense placeholder matching the app's skeleton language. */
function ViewFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <SkeletonCard lines={2} />
      <SkeletonCard />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <GhostFinEx />
    </AuthProvider>
  )
}

function GhostFinEx() {
  const auth = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [ghostOpen, setGhostOpen] = useState(false)
  const finance = useFinanceState()

  // The view is DERIVED, not synced via effects: `explicit` holds the last
  // user-chosen (or deep-linked) view; at the bare root the default is
  // auth-dependent — landing for guests, dashboard for signed-in users — so
  // the page switches naturally as auth resolves. No setState-in-effect.
  const [explicitId, setExplicitId] = useState(knownViewFromHash)

  const navigate = useCallback((id) => {
    setExplicitId(id)
    window.location.hash = id
    window.scrollTo({ top: 0 })
  }, [])

  // Browser back/forward: re-derive from the new hash (subscription callback,
  // not an effect body — fires only on real navigation events).
  useEffect(() => {
    const onHashChange = () => setExplicitId(knownViewFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // While Supabase restores the session (restoring=true), isDemo is not yet
  // meaningful — the user object is null. Default to the dashboard shell so a
  // signed-in user reloading the app sees their data loading instead of the
  // landing page flashing first. Deep links keep working: a guest deep-linking
  // #dashboard lands there, sees empty local demo state, and can still navigate.
  const activeId = explicitId ?? (auth.restoring || !auth.isDemo ? 'dashboard' : 'landing')

  if (activeId === 'landing') {
    return <LandingView onNavigate={navigate} />
  }

  const active = NAV_ITEMS.find((item) => item.id === activeId) ?? NAV_ITEMS[0]
  const ActiveView = LazyViews[active.id]

  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--gfx-accent-strong)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--gfx-accent-ink)]"
      >
        Skip to main content
      </a>

      <Sidebar activeId={activeId} onNavigate={navigate} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeId={activeId}
          onNavigate={navigate}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenGhost={() => setGhostOpen(true)}
          onReset={finance.resetToDemoData}
          isRemote={finance.isRemote}
          remoteLoading={Boolean(finance.isRemote && finance.status?.loading)}
        />

        {finance.status?.error && (
          <div className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6 lg:px-8">
            <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(248,113,113,0.35)] bg-[var(--gfx-danger-soft)] px-4 py-3 text-sm">
              <span className="text-[var(--gfx-danger)]">{finance.status.error}</span>
              <div className="flex shrink-0 items-center gap-2">
                {finance.isRemote && (
                  <button type="button" onClick={finance.refresh} className="font-medium text-[var(--gfx-danger)] underline underline-offset-2">
                    Retry
                  </button>
                )}
                <button type="button" onClick={finance.dismissError} className="font-medium text-[var(--gfx-muted)] hover:text-[var(--gfx-text)]">
                  Dismiss
                </button>
              </div>
            </div>
            </div>
        )}

        <main id="main-content" key={activeId} className="gfx-enter mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <ErrorBoundary key={activeId} onNavigateDashboard={() => navigate('dashboard')}>
            <Suspense fallback={<ViewFallback />}>
              <ActiveView finance={finance} onNavigate={navigate} />
            </Suspense>
          </ErrorBoundary>
        </main>

        <footer className="border-t border-[var(--gfx-border)] px-4 pb-24 pt-4 sm:px-6 lg:pb-4">
          <Disclaimer>
            GhostFinEx is a decision-support prototype. Every figure is calculated locally in your
            browser from the values you enter — nothing here is financial advice, and demo data is
            clearly labeled. Educate → Explain → Compare → Recommend options → You decide.
          </Disclaimer>
        </footer>

        <BottomNav activeId={activeId} onNavigate={navigate} />
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} activeId={activeId} onNavigate={navigate} />
      <GhostAssistant open={ghostOpen} onClose={() => setGhostOpen(false)} finance={finance} onNavigate={navigate} />
    </div>
  )
}
