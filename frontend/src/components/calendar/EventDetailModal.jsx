import Modal from '../ui/Modal.jsx'
import { Badge, Button } from '../ui/Primitives.jsx'
import { KIND_META, STATUS_META } from './calendarMeta.js'
import { formatCurrency, formatDate } from '../../lib/format'

/**
 * Detail dialog for a calendar event. Shows identity (what/when/how much),
 * the due-status pill, kind-specific context, and a deep link to the view
 * that owns the underlying data.
 */
export default function EventDetailModal({ event, onClose, onNavigate }) {
  if (!event) return null
  const meta = KIND_META[event.kind]
  const status = STATUS_META[event.status]

  const detailBody = () => {
    switch (event.kind) {
      case 'billing':
        return event.daysRemaining < 0
          ? 'This billing date has passed. The next occurrence stays on the calendar — nothing is charged automatically by this app.'
          : 'This is a recurring charge from your Subscriptions list. Editing or cancelling it there updates this date automatically.'
      case 'deadline':
        return 'This is the target date on one of your savings goals. The goal view shows progress and the weekly amount that keeps it on track.'
      case 'planned':
        return 'You scheduled this expense ahead of time. When it is paid, use "Mark as paid" so it moves into your real expense ledger and totals.'
      case 'expense':
        return 'This expense is already part of your ledger and totals.'
      case 'budget':
        return 'Your monthly budget plan restarts on the first of each month. Set or adjust the budget amount in the Financial overview.'
      default:
        return ''
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Event details"
      footer={
        <>
          {event.kind === 'planned' && event.onMarkPaid && (
            <Button
              onClick={() => {
                event.onMarkPaid(event.detailId)
                onClose()
              }}
            >
              Mark as paid
            </Button>
          )}
          {event.detailRoute && event.detailRoute !== '/calendar' && (
            <Button
              variant="secondary"
              onClick={() => {
                onNavigate(event.detailRoute.replace('/', ''))
                onClose()
              }}
            >
              Open {meta?.label?.toLowerCase() ?? 'related view'}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={meta?.badge}>{meta?.label ?? 'Event'}</Badge>
        {status?.label && <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.pill}`}>{status.label}</span>}
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status?.pill ?? ''}`}>{event.dueLabel}</span>
      </div>

      <div>
        <h3 className="mt-3 text-lg font-semibold text-[var(--gfx-text)]">{event.title}</h3>
        <p className="text-sm text-[var(--gfx-muted)]">{event.subtitle}</p>
      </div>

      <dl className="tabular grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
          <dt className="text-xs text-[var(--gfx-faint)]">Date</dt>
          <dd className="mt-0.5 font-semibold text-[var(--gfx-text)]">{formatDate(event.date)}</dd>
        </div>
        {event.amount !== null && event.amount !== undefined && (
          <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
            <dt className="text-xs text-[var(--gfx-faint)]">Amount</dt>
            <dd className="mt-0.5 font-semibold text-[var(--gfx-text)]">{formatCurrency(event.amount)}</dd>
          </div>
        )}
        <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 sm:col-span-2">
          <dt className="text-xs text-[var(--gfx-faint)]">Context</dt>
          <dd className="mt-0.5 text-sm text-[var(--gfx-muted)]">{event.amountLabel ?? 'No amount attached'}</dd>
        </div>
      </dl>

      <p className="text-sm leading-relaxed text-[var(--gfx-muted)]">{detailBody()}</p>
    </Modal>
  )
}
