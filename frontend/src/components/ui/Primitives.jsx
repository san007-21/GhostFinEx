/**
 * Small presentational primitives shared across all views.
 * They contain no financial logic — values arrive already computed.
 */
export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gfx-accent)] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]'
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2.5 text-sm',
  }
  const variants = {
    primary: 'bg-[var(--gfx-accent-strong)] text-[var(--gfx-accent-ink)] hover:bg-[var(--gfx-accent)] shadow-sm hover:shadow-md',
    secondary: 'border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] text-[var(--gfx-text)] hover:border-[var(--gfx-border-strong)] hover:bg-[var(--gfx-surface-3)]',
    ghost: 'text-[var(--gfx-muted)] hover:text-[var(--gfx-text)] hover:bg-[var(--gfx-surface-2)]',
    danger: 'text-[var(--gfx-danger)] hover:bg-[var(--gfx-danger-soft)]',
  }
  return <button type={type} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
}

export function NumberField({ label, value, onChange, min = 0, step = 1, prefix, suffix, hint, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">
        {label}
      </span>
      <span className="flex items-center gap-2 rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 transition-colors focus-within:border-[var(--gfx-accent-strong)]">
        {prefix && <span className="text-sm text-[var(--gfx-faint)]">{prefix}</span>}
        <input
          type="number"
          className="tabular w-full min-w-0 bg-transparent text-sm text-[var(--gfx-text)] outline-none"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          step={step}
          onChange={(e) => {
            const next = e.target.value === '' ? 0 : Number(e.target.value)
            onChange(Number.isFinite(next) ? next : 0)
          }}
          {...props}
        />
        {suffix && <span className="text-xs text-[var(--gfx-faint)]">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-[var(--gfx-faint)]">{hint}</span>}
    </label>
  )
}

export function TextField({ label, value, onChange, placeholder, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">
        {label}
      </span>
      <input
        type="text"
        className="w-full rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-sm text-[var(--gfx-text)] placeholder:text-[var(--gfx-faint)] focus:border-[var(--gfx-accent-strong)] focus:outline-none transition-colors"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  )
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">
        {label}
      </span>
      <select
        className="date-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ProgressBar({ value, tone = 'accent', className = '', label }) {
  const tones = {
    accent: 'bg-[var(--gfx-accent-strong)]',
    warn: 'bg-[var(--gfx-warn)]',
    danger: 'bg-[var(--gfx-danger)]',
    info: 'bg-[var(--gfx-info)]',
    violet: 'bg-[var(--gfx-violet)]',
  }
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-[var(--gfx-muted)]">{label}</span>
          <span className="tabular text-[var(--gfx-faint)]">{Math.round(value * 100)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === 'string' ? label : undefined}
        className={`h-2 w-full overflow-hidden rounded-full bg-[var(--gfx-surface-3)] ${className}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${tones[tone]}`}
          style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        />
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub, tone = 'default' }) {
  const tones = {
    default: 'text-[var(--gfx-text)]',
    accent: 'text-[var(--gfx-accent)]',
    warn: 'text-[var(--gfx-warn)]',
    danger: 'text-[var(--gfx-danger)]',
    info: 'text-[var(--gfx-info)]',
  }
  return (
    <div className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface)] p-4 transition-colors hover:border-[var(--gfx-border-strong)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">{label}</p>
      <p className={`tabular mt-1 text-2xl font-semibold ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--gfx-faint)]">{sub}</p>}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-[var(--gfx-surface-3)] text-[var(--gfx-muted)] border-[var(--gfx-border)]',
    accent: 'bg-[var(--gfx-accent-soft)] text-[var(--gfx-accent)] border-[rgba(52,211,153,0.35)]',
    warn: 'bg-[var(--gfx-warn-soft)] text-[var(--gfx-warn)] border-[rgba(251,191,36,0.35)]',
    danger: 'bg-[var(--gfx-danger-soft)] text-[var(--gfx-danger)] border-[rgba(248,113,113,0.35)]',
    info: 'bg-[var(--gfx-info-soft)] text-[var(--gfx-info)] border-[rgba(96,165,250,0.35)]',
    violet: 'bg-[var(--gfx-violet-soft)] text-[var(--gfx-violet)] border-[rgba(167,139,250,0.35)]',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Disclaimer({ children }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-xs leading-relaxed text-[var(--gfx-muted)]">
      <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-[var(--gfx-info)]" aria-hidden="true">
        <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm.75 8h-1.5V8h1.5v4.5Z" />
      </svg>
      {children}
    </p>
  )
}

/* --------------------------------- alerts -------------------------------- */

export function Alert({ tone = 'info', title, children }) {
  const tones = {
    info: { wrap: 'border-[rgba(96,165,250,0.35)] bg-[var(--gfx-info-soft)]', icon: 'text-[var(--gfx-info)]' },
    accent: { wrap: 'border-[rgba(52,211,153,0.35)] bg-[var(--gfx-accent-soft)]', icon: 'text-[var(--gfx-accent)]' },
    warn: { wrap: 'border-[rgba(251,191,36,0.35)] bg-[var(--gfx-warn-soft)]', icon: 'text-[var(--gfx-warn)]' },
    danger: { wrap: 'border-[rgba(248,113,113,0.35)] bg-[var(--gfx-danger-soft)]', icon: 'text-[var(--gfx-danger)]' },
  }
  const t = tones[tone] ?? tones.info
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${t.wrap}`}>
      <svg viewBox="0 0 16 16" className={`mt-0.5 h-4 w-4 shrink-0 ${t.icon}`} fill="currentColor" aria-hidden="true">
        <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm.75 8h-1.5V8h1.5v4.5Z" />
      </svg>
      <div>
        {title && <p className="font-medium text-[var(--gfx-text)]">{title}</p>}
        <div className="text-[var(--gfx-muted)]">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------ empty states ----------------------------- */

export function EmptyState({ icon: IconComponent, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--gfx-border)] bg-[var(--gfx-surface)] px-6 py-10 text-center">
      {IconComponent && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gfx-surface-3)] text-[var(--gfx-muted)]">
          <IconComponent className="h-5 w-5" />
        </div>
      )}
      <div>
        <p className="font-medium text-[var(--gfx-text)]">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--gfx-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/* --------------------------------- skeleton ------------------------------ */

export function Skeleton({ className = '' }) {
  return <div className={`gfx-skeleton ${className}`} aria-hidden="true" />
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="rounded-2xl border border-[var(--gfx-border)] bg-[var(--gfx-surface)] p-5">
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i % 2 ? 'w-3/4' : 'w-full'}`} />
        ))}
      </div>
    </div>
  )
}
