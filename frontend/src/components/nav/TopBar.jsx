import { useState } from 'react'
import { Button } from '../ui/Primitives.jsx'
import { ConfirmDialog } from '../ui/Modal.jsx'
import { IconGhost, IconMenu, IconReset } from '../ui/icons.jsx'
import { NAV_ITEMS } from './navItems.js'

/**
 * Top bar across all breakpoints: hamburger + title on small screens, Ghost
 * assistant trigger and demo reset on all. Reset asks for confirmation since
 * it clears user-entered data.
 */
export default function TopBar({ activeId, onOpenMenu, onOpenGhost, onReset }) {
  const [confirmingReset, setConfirmingReset] = useState(false)
  const active = NAV_ITEMS.find((item) => item.id === activeId)

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--gfx-border)] bg-[var(--gfx-bg)]/85 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-[var(--gfx-muted)] transition-colors hover:bg-[var(--gfx-surface-2)] hover:text-[var(--gfx-text)] lg:hidden"
        >
          <IconMenu className="h-5 w-5" />
        </button>

        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-[var(--gfx-text)]">
          {active?.label ?? 'Dashboard'}
        </h1>

        <Button variant="secondary" size="sm" onClick={onOpenGhost} className="!rounded-full">
          <IconGhost className="h-4 w-4 text-[var(--gfx-accent)]" />
          <span className="hidden sm:inline">Ask Ghost</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setConfirmingReset(true)} title="Reset all entered values back to the demo seed">
          <IconReset />
          <span className="hidden lg:inline">Reset demo</span>
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingReset}
        onClose={() => setConfirmingReset(false)}
        onConfirm={onReset}
        title="Reset to demo data?"
        confirmLabel="Reset everything"
        danger
      >
        <p className="text-sm text-[var(--gfx-muted)]">
          This clears every value you have entered — budget, expenses, goals, subscriptions, and
          tracked items — and restores the labeled demo data. This cannot be undone.
        </p>
      </ConfirmDialog>
    </header>
  )
}
