/**
 * Shared page header: one place for the h1 + subtitle + actions pattern so
 * every view has the same visual rhythm.
 */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--gfx-text)]">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-[var(--gfx-muted)]">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
