/**
 * Charts.jsx — deterministic SVG charts, no libraries.
 * Data arrives pre-computed from lib/finance; these are display-only.
 */
import { formatCurrency } from '../../lib/format'
import { Skeleton } from '../ui/Primitives.jsx'

/** Horizontal category bars (label, value, share of max). */
export function CategoryBars({ data, tone = 'accent' }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map((d) => d.value))
  const toneClass = {
    accent: 'bg-[var(--gfx-accent-strong)]',
    warn: 'bg-[var(--gfx-warn)]',
    danger: 'bg-[var(--gfx-danger)]',
    info: 'bg-[var(--gfx-info)]',
    violet: 'bg-[var(--gfx-violet)]',
  }[tone]

  return (
    <ul className="space-y-3">
      {data.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-[var(--gfx-muted)]">{item.label}</span>
            <span className="tabular font-medium text-[var(--gfx-text)]">{formatCurrency(item.value, { compact: true })}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--gfx-surface-3)]">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${toneClass}`}
              style={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Column chart over month labels (2-decimal values, compact formatted). */
export function MonthlyColumns({ months, valueByMonth, tone = 'accent' }) {
  const values = months.map((m) => valueByMonth(m))
  const max = Math.max(...values, 1)
  const toneClass = {
    accent: 'bg-[var(--gfx-accent-strong)]',
    info: 'bg-[var(--gfx-info)]',
    violet: 'bg-[var(--gfx-violet)]',
  }[tone]

  return (
    <div className="flex h-40 items-end gap-2">
      {months.map((m, i) => (
        <div key={`${m.year}-${m.month}`} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="tabular text-[10px] text-[var(--gfx-faint)]">
            {values[i] > 0 ? formatCurrency(values[i], { compact: true }) : ''}
          </span>
          <div
            className={`w-full rounded-t-md transition-[height] duration-500 ${toneClass}`}
            style={{ height: `${Math.max(2, (values[i] / max) * 100)}%` }}
            title={`${m.label}: ${formatCurrency(values[i])}`}
          />
          <span className="text-[10px] text-[var(--gfx-muted)]">{m.label.slice(0, 3)}</span>
        </div>
      ))}
    </div>
  )
}

/** Simple polyline projection chart with a clean area fill. */
export function ProjectionLine({ points, tone = 'violet' }) {
  if (!points || points.length < 2) return null
  const w = 100
  const h = 40
  const min = Math.min(...points, 0)
  const max = Math.max(...points, 1)
  const range = max - min || 1
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - ((p - min) / range) * h
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const strokeColor = {
    accent: 'var(--gfx-accent-strong)',
    info: 'var(--gfx-info)',
    violet: 'var(--gfx-violet)',
  }[tone]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full" preserveAspectRatio="none" role="img" aria-label="Projection chart">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={`0,${h} ${coords.join(' ')} ${w},${h}`}
        fill={strokeColor}
        opacity="0.12"
      />
      <line
        x1="0"
        y1={h - ((0 - min) / range) * h}
        x2={w}
        y2={h - ((0 - min) / range) * h}
        stroke="var(--gfx-border-strong)"
        strokeDasharray="2 2"
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** Donut showing composition of a total across categories. */
export function Donut({ data, centerLabel, centerValue }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total <= 0) return null
  const colors = [
    'var(--gfx-accent-strong)',
    'var(--gfx-info)',
    'var(--gfx-violet)',
    'var(--gfx-warn)',
    'var(--gfx-pink)',
  ]
  const r = 15.9155 // circumference 100
  const segments = []
  let offset = 0
  for (let i = 0; i < data.length; i += 1) {
    const share = (data[i].value / total) * 100
    segments.push({ dasharray: `${share} ${100 - share}`, dashoffset: 100 - offset + 25, color: colors[i % colors.length] })
    offset += share
  }

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 42 42" className="h-32 w-32 shrink-0" role="img" aria-label="Spending composition">
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--gfx-surface-3)" strokeWidth="6" />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx="21"
            cy="21"
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="6"
            strokeDasharray={seg.dasharray}
            strokeDashoffset={seg.dashoffset}
            strokeLinecap="butt"
          />
        ))}
        <text x="21" y="20" textAnchor="middle" className="fill-[var(--gfx-text)]" style={{ fontSize: 5, fontWeight: 600 }}>
          {centerValue}
        </text>
        <text x="21" y="26" textAnchor="middle" className="fill-[var(--gfx-faint)]" style={{ fontSize: 2.6 }}>
          {centerLabel}
        </text>
      </svg>
      <ul className="min-w-0 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: colors[i % colors.length] }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-[var(--gfx-muted)]">{d.label}</span>
            <span className="tabular text-[var(--gfx-text)]">{formatCurrency(d.value, { compact: true })}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Skeleton placeholder for chart areas while data "loads". */
export function ChartSkeleton({ height = 'h-40' }) {
  return <Skeleton className={`w-full ${height}`} />
}
