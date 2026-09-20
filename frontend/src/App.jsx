import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { useFinanceState } from './hooks/useFinanceState'
import { Disclaimer } from './components/ui/Primitives.jsx'
import Sidebar from './components/nav/Sidebar.jsx'
import TopBar from './components/nav/TopBar.jsx'
import MobileMenu from './components/nav/MobileMenu.jsx'
import BottomNav from './components/nav/BottomNav.jsx'
import GhostAssistant from './components/GhostAssistant.jsx'
import { NAV_ITEMS } from './components/nav/navItems.js'

function initialViewId() {
  const hash = window.location.hash.replace('#', '')
  return NAV_ITEMS.some((item) => item.id === hash) ? hash : 'dashboard'
}

export default function App() {
  const [activeId, setActiveId] = useState(initialViewId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [ghostOpen, setGhostOpen] = useState(false)
  const finance = useFinanceState()

  const navigate = useCallback((id) => {
    setActiveId(id)
    window.location.hash = id
    window.scrollTo({ top: 0 })
  }, [])

  // Browser back/forward support
  useEffect(() => {
    const onHashChange = () => setActiveId(initialViewId())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

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
        />

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
      <GhostAssistant open={ghostOpen} onClose={() => setGhostOpen(false)} finance={finance} />
    </div>
  )
}
