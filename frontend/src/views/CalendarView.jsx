import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Badge, Button, Disclaimer } from '../components/ui/Primitives.jsx'
import { MONTH_LABELS, WEEKDAY_LABELS, groupEventsByDate, monthGrid, shortDayLabel } from '../lib/calendar'
import { formatCurrency } from '../lib/format'

/**
 * Financial calendar: renewals, goal deadlines, and logged expenses on one
 * month grid. Deterministic grouping over local data; month navigation is
 * pure date arithmetic.
 */
export default function CalendarView({ finance }) {
  const { renewals, goals, expenses } = finance
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  }))

  // Build deterministic event lists from local data.
  const events = useMemo(() => {
    const list = []
    for (const renewal of renewals) {
      list.push({ date: renewal.date, kind: 'renewal', label: renewal.name, amount: renewal.amount, tone: 'info' })
    }
    for (const goal of goals) {
      list.push({ date: goal.deadline, kind: 'deadline', label: `Goal due: ${goal.name}`, amount: goal.target, tone: 'accent' })
    }
    for (const expense of expenses) {
      list.push({ date: expense.date, kind: 'expense', label: expense.note || expense.category, amount: expense.amount, tone: 'neutral' })
    }
    return list
  }, [renewals, goals, expenses])

  const byDate = useMemo(() => groupEventsByDate(events), [events])
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])

  const moveMonth = (delta) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month - 1 + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() + 1 }
    })
  }

  // Upcoming: events from today onward, next 5.
  const upcoming = useMemo(() => {
    const todayIso = today.toISOString().slice(0, 10)
    return events
      .filter((event) => event.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
  }, [events, today])

  const [selectedDate, setSelectedDate] = useState(null)
  const selectedEvents = selectedDate ? (byDate.get(selectedDate) ?? []) : []

  return (
    <div>
      <PageHeader
        title="Financial calendar"
        subtitle="Renewals, deadlines, and spending on one grid — see what is coming before it arrives."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--gfx-text)]">
              {MONTH_LABELS[cursor.month - 1]} {cursor.year}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => moveMonth(-1)} aria-label="Previous month">←</Button>
              <Button variant="secondary" size="sm" onClick={() => moveMonth(1)} aria-label="Next month">→</Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="pb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--gfx-faint)]">
                {label}
              </div>
            ))}
            {weeks.flat().map((cell, index) => {
              if (!cell) return <div key={`pad-${index}`} aria-hidden="true" />
              const iso = cell.iso
              const dayEvents = byDate.get(iso) ?? []
              const isToday = iso === today.toISOString().slice(0, 10)
              const isSelected = iso === selectedDate
              const hasRenewal = dayEvents.some((e) => e.kind === 'renewal')
              const hasDeadline = dayEvents.some((e) => e.kind === 'deadline')
              const hasExpense = dayEvents.some((e) => e.kind === 'expense')
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : iso)}
                  aria-pressed={isSelected}
                  aria-label={`${cell.day} ${MONTH_LABELS[cursor.month - 1]}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : ''}`}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors ${
                    isSelected
                      ? 'border-[var(--gfx-accent-strong)] bg-[var(--gfx-accent-soft)] text-[var(--gfx-accent)]'
                      : isToday
                        ? 'border-[var(--gfx-border-strong)] bg-[var(--gfx-surface-3)] text-[var(--gfx-text)]'
                        : 'border-transparent text-[var(--gfx-muted)] hover:border-[var(--gfx-border)] hover:bg-[var(--gfx-surface-2)]'
                  }`}
                >
                  {cell.day}
                  {(hasRenewal || hasDeadline || hasExpense) && (
                    <span className="absolute bottom-1.5 flex gap-0.5">
                      {hasRenewal && <span className="h-1.5 w-1.5 rounded-full bg-[var(--gfx-info)]" />}
                      {hasDeadline && <span className="h-1.5 w-1.5 rounded-full bg-[var(--gfx-accent)]" />}
                      {hasExpense && <span className="h-1.5 w-1.5 rounded-full bg-[var(--gfx-faint)]" />}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 border-t border-[var(--gfx-border)] pt-3 text-xs text-[var(--gfx-muted)]">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--gfx-info)]" /> Renewal</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--gfx-accent)]" /> Goal deadline</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--gfx-faint)]" /> Expense logged</span>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title={selectedDate ? shortDayLabel(selectedDate) : 'Select a day'} subtitle={selectedDate ? `${selectedEvents.length} entr${selectedEvents.length === 1 ? 'y' : 'ies'}` : 'Tap a date to see its events'}>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-[var(--gfx-faint)]">
                {selectedDate ? 'Nothing scheduled for this day.' : 'Renewals, goal deadlines, and expenses appear here.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {selectedEvents.map((event, index) => (
                  <li key={`${event.date}-${event.kind}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-[var(--gfx-text)]">{event.label}</p>
                      <Badge tone={event.tone === 'neutral' ? 'neutral' : event.tone}>{event.kind}</Badge>
                    </div>
                    <span className="tabular shrink-0 text-[var(--gfx-text)]">{formatCurrency(event.amount, { compact: true })}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming" subtitle="Next five events from today">
            {upcoming.length === 0 ? (
              <p className="text-sm text-[var(--gfx-faint)]">Nothing scheduled ahead.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((event, index) => (
                  <li key={`${event.date}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-[var(--gfx-text)]">{event.label}</p>
                      <p className="text-xs text-[var(--gfx-faint)]">{shortDayLabel(event.date)}</p>
                    </div>
                    <span className="tabular shrink-0 text-[var(--gfx-text)]">{formatCurrency(event.amount, { compact: true })}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Disclaimer>
          The calendar reads from your local entries — no external calendar or billing feed is
          connected in this phase. Renewal dates in the demo seed are examples, clearly labeled.
        </Disclaimer>
      </div>
    </div>
  )
}
