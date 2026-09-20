/**
 * calendarMeta.js — presentation metadata for calendar event kinds.
 * Keeps color meaning consistent across agenda, month grid, and dashboards.
 */
export const KIND_META = {
  billing: {
    label: 'Subscription billing',
    dot: 'bg-[var(--gfx-info)]',
    bar: 'bg-[var(--gfx-info)]',
    badge: 'info',
  },
  deadline: {
    label: 'Savings target',
    dot: 'bg-[var(--gfx-accent)]',
    bar: 'bg-[var(--gfx-accent-strong)]',
    badge: 'accent',
  },
  planned: {
    label: 'Planned expense',
    dot: 'bg-[var(--gfx-violet)]',
    bar: 'bg-[var(--gfx-violet)]',
    badge: 'violet',
  },
  expense: {
    label: 'Logged expense',
    dot: 'bg-[var(--gfx-faint)]',
    bar: 'bg-[var(--gfx-border-strong)]',
    badge: 'neutral',
  },
  budget: {
    label: 'Budget reset',
    dot: 'bg-[var(--gfx-warn)]',
    bar: 'bg-[var(--gfx-warn)]',
    badge: 'warn',
  },
}

/** Status metadata — deliberately calm wording, never alarmist. */
export const STATUS_META = {
  overdue: {
    label: 'Date passed',
    pill: 'border-[rgba(251,191,36,0.4)] bg-[var(--gfx-warn-soft)] text-[var(--gfx-warn)]',
    row: 'border-l-[var(--gfx-warn)]',
  },
  today: {
    label: 'Due today',
    pill: 'border-[rgba(96,165,250,0.4)] bg-[var(--gfx-info-soft)] text-[var(--gfx-info)]',
    row: 'border-l-[var(--gfx-info)]',
  },
  soon: {
    label: 'Coming up',
    pill: 'border-[rgba(96,165,250,0.25)] bg-[var(--gfx-info-soft)]/60 text-[var(--gfx-info)]',
    row: 'border-l-[var(--gfx-info)]',
  },
  upcoming: {
    label: null, // dueLabel carries the text
    pill: 'border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] text-[var(--gfx-muted)]',
    row: 'border-l-[var(--gfx-border)]',
  },
}
