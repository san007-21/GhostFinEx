import { NAV_ITEMS } from './navItems.js'

/**
 * Desktop sidebar (≥1024px). Groups views into Money / Decide / Plan so the
 * IA reads as a product, not a link dump.
 */
export default function Sidebar({ activeId, onNavigate }) {
  const groups = ['Money', 'Decide', 'Plan']
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--gfx-border)] bg-[var(--gfx-surface)] lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo />
        <div>
          <p className="text-sm font-semibold tracking-tight text-[var(--gfx-text)]">GhostFinEx</p>
          <p className="text-[11px] text-[var(--gfx-faint)]">Decide with clarity</p>
        </div>
      </div>
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-4">
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
                      onClick={() => onNavigate(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-[var(--gfx-accent-soft)] font-medium text-[var(--gfx-accent)]'
                          : 'text-[var(--gfx-muted)] hover:bg-[var(--gfx-surface-2)] hover:text-[var(--gfx-text)]'
                      }`}
                    >
                      <IconComponent className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isActive ? 'text-[var(--gfx-accent)]' : ''}`} />
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-[var(--gfx-border)] px-5 py-3">
        <p className="text-[11px] leading-relaxed text-[var(--gfx-faint)]">
          Decision support — not financial advice. Your data stays in this browser.
        </p>
      </div>
    </aside>
  )
}

function Logo() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--gfx-accent-strong)] to-[var(--gfx-info)] text-sm font-bold text-[var(--gfx-accent-ink)] shadow-lg shadow-emerald-500/20"
      aria-hidden="true"
    >
      G
    </div>
  )
}
