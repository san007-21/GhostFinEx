import { useEffect } from 'react'
import { NAV_ITEMS } from './navItems.js'
import { IconX } from '../ui/icons.jsx'

/**
 * Slide-in drawer for navigation below lg. Locks body scroll, closes on
 * Escape and backdrop tap.
 */
export default function MobileMenu({ open, onClose, activeId, onNavigate }) {
  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null
  const groups = ['Money', 'Decide', 'Plan']

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="gfx-enter absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r border-[var(--gfx-border-strong)] bg-[var(--gfx-surface)] shadow-[var(--gfx-shadow-lg)]">
        <div className="flex items-center justify-between px-4 py-4">
          <p className="text-sm font-semibold text-[var(--gfx-text)]">GhostFinEx</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-[var(--gfx-muted)] hover:bg-[var(--gfx-surface-2)] hover:text-[var(--gfx-text)]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        <nav aria-label="Primary" className="px-3 pb-6">
          {groups.map((group) => (
            <div key={group} className="mb-4">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gfx-faint)]">
                {group}
              </p>
              <ul className="space-y-0.5">
                {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                  const IconComponent = item.icon
                  const isActive = activeId === item.id
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate(item.id)
                          onClose()
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-[var(--gfx-accent-soft)] font-medium text-[var(--gfx-accent)]'
                            : 'text-[var(--gfx-muted)] hover:bg-[var(--gfx-surface-2)] hover:text-[var(--gfx-text)]'
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
          ))}
        </nav>
      </div>
    </div>
  )
}
