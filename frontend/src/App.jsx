import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { useFinanceState } from './hooks/useFinanceState'
import { AuthProvider } from './auth/authContext.jsx'
import { useAuth } from './auth/useAuth.js'
import { Disclaimer } from './components/ui/Primitives.jsx'
import Sidebar from './components/nav/Sidebar.jsx'
import TopBar from './components/nav/TopBar.jsx'
import MobileMenu from './components/nav/MobileMenu.jsx'
import BottomNav from './components/nav/BottomNav.jsx'
import GhostAssistant from './components/GhostAssistant.jsx'
import LandingView from './views/LandingView.jsx'
import { NAV_ITEMS } from './components/nav/navItems.js'

/**
 * Resolve a known view id from the URL hash, or null when at the bare root.
 * `landing` is the public marketing page; NAV_ITEM ids are the app views.
 */
function knownViewFromHash() {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'landing') return 'landing'
  if (NAV_ITEMS.some((item) => item.id === hash)) return hash
  return null
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
  const ActiveView = active.View

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
          <ActiveView finance={finance} onNavigate={navigate} />
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
