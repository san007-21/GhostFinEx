/**
 * Card — the reusable surface primitive for the whole app.
 * Uses the shared `.glass` treatment (translucent panel + restrained blur
 * defined in index.css) so every surface reads as one cohesive material.
 */
export default function Card({ title, subtitle, actions, className = '', children, as: Tag = 'section' }) {
  return (
    <Tag
      className={`glass min-w-0 rounded-2xl p-5 ${className}`}
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
