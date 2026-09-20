import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Modal, { ConfirmDialog } from '../components/ui/Modal.jsx'
import { Button, Disclaimer, EmptyState, NumberField, SelectField, StatCard, TextField } from '../components/ui/Primitives.jsx'
import { MONTH_LABELS, WEEKDAY_LABELS, groupEventsByDate, monthGrid, shortDayLabel, toIsoDate } from '../lib/calendar'
import { bucketEvents, billingDueWithin, deriveCalendarEvents } from '../lib/events'
import { formatCurrency, formatDate } from '../lib/format'
import { dueLabel } from '../lib/calendar'
import { KIND_META, STATUS_META } from '../components/calendar/calendarMeta.js'
import EventDetailModal from '../components/calendar/EventDetailModal.jsx'
import { IconCalendar } from '../components/ui/icons.jsx'

const EMPTY_PLAN = { name: '', amount: 0, category: 'Other', date: '', notes: '' }
const FILTERS = [
  { value: 'all', label: 'All events' },
  { value: 'billing', label: 'Billing' },
  { value: 'deadline', label: 'Savings targets' },
  { value: 'planned', label: 'Planned expenses' },
  { value: 'expense', label: 'Logged expenses' },
  { value: 'budget', label: 'Budget resets' },
]

/**
 * Financial calendar & due dates. Everything shown is derived from the
 * user's own data: goal target dates, recurring subscription billing,
 * planned expenses, logged expenses, and monthly budget resets.
 */
export default function CalendarView({ finance, onNavigate }) {
  const { goals, subscriptions, plannedExpenses, expenses, payPlannedExpense } = finance
  const today = useMemo(() => new Date(), [])
  const todayIso = toIsoDate(today)

  const events = useMemo(
    () =>
      deriveCalendarEvents({
        goals,
        subscriptions,
        plannedExpenses,
        expenses,
        today,
      }).map((event) => ({
        ...event,
        dueLabel: dueLabel(event.daysRemaining),
        onMarkPaid: event.kind === 'planned' ? payPlannedExpense : undefined,
      })),
    [goals, subscriptions, plannedExpenses, expenses, today, payPlannedExpense],
  )

  const [filter, setFilter] = useState('all')
  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter((event) => event.kind === filter)),
    [events, filter],
  )
  const buckets = useMemo(() => bucketEvents(filtered), [filtered])

  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() + 1 }))

  const byDate = useMemo(() => groupEventsByDate(filtered), [filtered])
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])
  const dayEvents = selectedDate ? (byDate.get(selectedDate) ?? []) : []

  const moveMonth = (delta) =>
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month - 1 + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() + 1 }
    })

  /* Planned-expense management */
  const [planOpen, setPlanOpen] = useState(false)
  const [planForm, setPlanForm] = useState(EMPTY_PLAN)
  const [planError, setPlanError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const plannedUpcoming = plannedExpenses
    .filter((plan) => plan.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))

  const submitPlan = (event) => {
    event.preventDefault()
    const name = planForm.name.trim()
    if (!name) return setPlanError('Give the planned expense a name.')
    if (planForm.amount <= 0) return setPlanError('Amount must be greater than zero.')
    if (!planForm.date) return setPlanError('Pick a date.')
    finance.addPlannedExpense({ name, amount: planForm.amount, category: planForm.category, date: planForm.date, notes: planForm.notes.trim() })
    setPlanForm(EMPTY_PLAN)
    setPlanError('')
    setPlanOpen(false)
  }

  const totalUpcomingBills = billingDueWithin(events, 30)
  const soonCount = buckets.soon.length + buckets.overdue.length

  return (
    <div>
      <PageHeader
        title="Financial calendar"
        subtitle="Due dates derived from your own data — savings targets, recurring billing, planned expenses, and budget resets."
      >
        <Button onClick={() => { setPlanError(''); setPlanOpen(true) }}>+ Plan an expense</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Needs attention" value={String(soonCount)} sub="due within 7 days or date passed" tone={soonCount > 0 ? 'info' : 'default'} />
        <StatCard label="Billing due (30 days)" value={formatCurrency(totalUpcomingBills, { compact: true })} sub="subscription charges ahead" tone="info" />
        <StatCard label="Planned expenses" value={String(plannedUpcoming.length)} sub="scheduled but not yet paid" tone="violet" />
        <StatCard label="Events tracked" value={String(filtered.length)} sub={filter === 'all' ? 'all kinds' : FILTERS.find((f) => f.value === filter)?.label} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {/* Agenda */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <select className="date-input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter events by kind">
              {FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--gfx-muted)]">
              {Object.entries(KIND_META).map(([kind, meta]) => (
                <span key={kind} className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                  {meta.label}
                </span>
              ))}
            </div>
          </div>

          {events.length === 0 ? (
            <EmptyState
              icon={IconCalendar}
              title="Nothing on the calendar yet"
              description="Add a savings goal, subscription, or planned expense and its dates will appear here automatically."
              action={<Button onClick={() => setPlanOpen(true)}>+ Plan an expense</Button>}
            />
          ) : (
            <>
              {buckets.overdue.length > 0 && (
                <Card title="Date passed" subtitle="These dates are behind you — worth a look when convenient">
                  <ul className="space-y-2">
                    {buckets.overdue.map((event) => (
                      <EventRow key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                    ))}
                  </ul>
                </Card>
              )}

              <Card title="Next 7 days" subtitle="Due today or within the week">
                {buckets.soon.length === 0 ? (
                  <p className="text-sm text-[var(--gfx-faint)]">Nothing due this week — a clear stretch ahead.</p>
                ) : (
                  <ul className="space-y-2">
                    {buckets.soon.map((event) => (
                      <EventRow key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Later" subtitle="Beyond the next week">
                <ul className="space-y-2">
                  {buckets.upcoming.slice(0, 12).map((event) => (
                    <EventRow key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                  ))}
                </ul>
                {buckets.upcoming.length > 12 && (
                  <p className="mt-3 text-xs text-[var(--gfx-faint)]">
                    {buckets.upcoming.length - 12} more scheduled — use the filter above to focus on one kind.
                  </p>
                )}
              </Card>
            </>
          )}
        </div>

        {/* Month grid + day detail */}
        <div className="space-y-4">
          <Card>
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
                const cellEvents = byDate.get(iso) ?? []
                const isToday = iso === todayIso
                const isSelected = iso === selectedDate
                const kinds = [...new Set(cellEvents.map((e) => e.kind))]
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : iso)}
                    aria-pressed={isSelected}
                    aria-label={`${cell.day} ${MONTH_LABELS[cursor.month - 1]}${cellEvents.length ? `, ${cellEvents.length} event${cellEvents.length === 1 ? '' : 's'}` : ''}`}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors ${
                      isSelected
                        ? 'border-[var(--gfx-accent-strong)] bg-[var(--gfx-accent-soft)] text-[var(--gfx-accent)]'
                        : isToday
                          ? 'border-[var(--gfx-border-strong)] bg-[var(--gfx-surface-3)] text-[var(--gfx-text)]'
                          : 'border-transparent text-[var(--gfx-muted)] hover:border-[var(--gfx-border)] hover:bg-[var(--gfx-surface-2)]'
                    }`}
                  >
                    {cell.day}
                    {kinds.length > 0 && (
                      <span className="absolute bottom-1.5 flex gap-0.5">
                        {kinds.map((kind) => (
                          <span key={kind} className={`h-1.5 w-1.5 rounded-full ${KIND_META[kind]?.dot ?? 'bg-[var(--gfx-faint)]'}`} />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card title={selectedDate ? shortDayLabel(selectedDate) : 'Select a day'} subtitle={selectedDate ? `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : 'Tap a date to see its events'}>
            {dayEvents.length === 0 ? (
              <p className="text-sm text-[var(--gfx-faint)]">
                {selectedDate ? 'Nothing scheduled for this day.' : 'Events appear here when you select a date.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {dayEvents.map((event) => (
                  <li key={event.id}>
                    <button type="button" onClick={() => setSelectedEvent(event)} className="w-full rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-left transition-colors hover:border-[var(--gfx-border-strong)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-[var(--gfx-text)]">{event.title}</span>
                        {event.amount !== null && event.amount !== undefined && (
                          <span className="tabular shrink-0 text-sm text-[var(--gfx-muted)]">{formatCurrency(event.amount, { compact: true })}</span>
                        )}
                      </div>
                      <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_META[event.status]?.pill ?? ''}`}>
                        {event.dueLabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Planned expenses"
            subtitle="Scheduled ahead — mark as paid when done"
            actions={<Button variant="ghost" size="sm" onClick={() => setPlanOpen(true)}>+ Plan</Button>}
          >
            {plannedUpcoming.length === 0 ? (
              <p className="text-sm text-[var(--gfx-faint)]">Nothing planned ahead. Use "Plan an expense" to schedule the next one.</p>
            ) : (
              <ul className="space-y-2">
                {plannedUpcoming.map((plan) => {
                  const days = Math.round((new Date(plan.date) - today) / 86400000)
                  return (
                    <li key={plan.id} className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-[var(--gfx-text)]">{plan.name}</span>
                        <span className="tabular text-sm text-[var(--gfx-text)]">{formatCurrency(plan.amount, { compact: true })}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-[var(--gfx-faint)]">{formatDate(plan.date)} · {plan.category}</span>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => payPlannedExpense(plan.id)}>
                            Mark as paid
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setPendingDelete(plan)} aria-label={`Remove ${plan.name}`}>
                            Remove
                          </Button>
                        </div>
                      </div>
                      {Number.isFinite(days) && (
                        <p className="mt-1 text-xs text-[var(--gfx-faint)]">
                          {days < 0 ? 'Date passed' : dueLabel(days)}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onNavigate={onNavigate} />

      {/* Plan-an-expense modal */}
      <Modal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        title="Plan an expense"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPlanOpen(false)}>Cancel</Button>
            <Button onClick={submitPlan}>Save plan</Button>
          </>
        }
      >
        <form onSubmit={submitPlan} className="space-y-4">
          <TextField label="Name" value={planForm.name} onChange={(v) => setPlanForm((f) => ({ ...f, name: v }))} placeholder="e.g. Monthly rent" />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Amount (R)" value={planForm.amount} onChange={(v) => setPlanForm((f) => ({ ...f, amount: v }))} step={50} prefix="R" />
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Date</span>
              <input type="date" className="date-input" value={planForm.date} onChange={(e) => setPlanForm((f) => ({ ...f, date: e.target.value }))} />
            </label>
          </div>
          <SelectField
            label="Category"
            value={planForm.category}
            onChange={(v) => setPlanForm((f) => ({ ...f, category: v }))}
            options={finance.categories.map((c) => ({ value: c, label: c }))}
          />
          <TextField label="Notes (optional)" value={planForm.notes} onChange={(v) => setPlanForm((f) => ({ ...f, notes: v }))} placeholder="Anything worth remembering" />
          {planError && <p role="alert" className="text-sm text-[var(--gfx-danger)]">{planError}</p>}
          <button type="submit" className="sr-only">Save</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => finance.removePlannedExpense(pendingDelete.id)}
        title="Remove planned expense?"
        confirmLabel="Remove"
        danger
      >
        <p className="text-sm text-[var(--gfx-muted)]">"{pendingDelete?.name}" will be removed from the schedule. It was never part of your spending totals.</p>
      </ConfirmDialog>

      <div className="mt-6">
        <Disclaimer>
          Calendar events are derived in your browser from your own entries — a goal's target date, a
          subscription's billing cycle, a planned expense. Nothing is fetched from any external
          service, and no reminders are sent; this is a planning view.
        </Disclaimer>
      </div>
    </div>
  )
}

/** One agenda row: color bar, title, type, amount, days-remaining pill. */
function EventRow({ event, onClick }) {
  const meta = KIND_META[event.kind]
  const status = STATUS_META[event.status]
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`group flex w-full items-center gap-3 rounded-lg border border-[var(--gfx-border)] border-l-4 bg-[var(--gfx-surface-2)] px-3 py-2.5 text-left transition-colors hover:border-[var(--gfx-border-strong)] ${status?.row ?? ''}`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--gfx-text)]">{event.title}</p>
          <p className="mt-0.5 text-xs text-[var(--gfx-faint)]">
            {formatDate(event.date)} · {meta?.label}
            {event.subtitle ? ` · ${event.subtitle.split('·').slice(1).join('·').trim() || event.subtitle}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {event.amount !== null && event.amount !== undefined && (
            <span className="tabular hidden text-sm text-[var(--gfx-muted)] sm:block">{formatCurrency(event.amount, { compact: true })}</span>
          )}
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status?.pill ?? ''}`}>
            {event.dueLabel}
          </span>
        </div>
        <span className="text-xs text-[var(--gfx-faint)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">›</span>
      </button>
    </li>
  )
}
