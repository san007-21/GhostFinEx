/**
 * Card — the reusable surface primitive for the whole app.
 */
export default function Card({ title, subtitle, actions, className = '', children, as: Tag = 'section' }) {
  return (
    <Tag
      className={`rounded-2xl border border-[var(--gfx-border)] bg-[var(--gfx-surface)] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] ${className}`}
    >
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-[var(--gfx-text)]">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-[var(--gfx-muted)]">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  )
}
