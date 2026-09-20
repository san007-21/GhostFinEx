import { useState } from 'react'
import { MOBILE_BOTTOM_ITEMS, NAV_ITEMS } from './navItems.js'
import { IconMenu, IconX } from '../ui/icons.jsx'

/**
 * Mobile bottom navigation (< lg): four key views plus a "More" sheet holding
 * the remaining views, so nothing is more than one tap away. Thumb-reach
 * sized with safe-area padding.
 */
export default function BottomNav({ activeId, onNavigate }) {
  const [moreOpen, setMoreOpen] = useState(false)

  const go = (id) => {
    onNavigate(id)
    setMoreOpen(false)
  }

  return (
    <>
      <nav
        aria-label="Primary mobile"
        className="gfx-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-[var(--gfx-border)] bg-[var(--gfx-bg)]/95 pt-1 backdrop-blur lg:hidden"
      >
        <ul className="flex items-stretch">
          {MOBILE_BOTTOM_ITEMS.map((item) => {
            const IconComponent = item.icon
            const isActive = activeId === item.id
            return (
              <li key={item.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => go(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] transition-colors ${
                    isActive ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-faint)] hover:text-[var(--gfx-text)]'
                  }`}
                >
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-[var(--gfx-accent-soft)]' : ''}`}>
                    <IconComponent className="h-5 w-5" />
                  </span>
                  {shortLabel(item.label)}
                </button>
              </li>
            )
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className="flex w-full flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] text-[var(--gfx-faint)] transition-colors hover:text-[var(--gfx-text)]"
            >
              <span className="flex h-7 w-12 items-center justify-center rounded-full">
                <IconMenu className="h-5 w-5" />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="All sections">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="gfx-enter absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--gfx-border-strong)] bg-[var(--gfx-surface)] p-4 pb-8 shadow-[var(--gfx-shadow-lg)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--gfx-text)]">All sections</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-[var(--gfx-muted)] hover:bg-[var(--gfx-surface-2)] hover:text-[var(--gfx-text)]"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => {
                const IconComponent = item.icon
                const isActive = activeId === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? 'border-[rgba(52,211,153,0.4)] bg-[var(--gfx-accent-soft)] text-[var(--gfx-accent)]'
                          : 'border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] text-[var(--gfx-muted)] hover:text-[var(--gfx-text)]'
                      }`}
                    >
                      <IconComponent className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}

function shortLabel(label) {
  if (label === 'Savings goals') return 'Goals'
  if (label === 'Financial calendar') return 'Calendar'
  return label
}
