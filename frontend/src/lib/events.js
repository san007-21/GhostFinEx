/**
 * events.js — derives calendar events from the user's existing local data.
 *
 * Pure functions only: same data in, same events out. No AI, no network.
 * Event kinds:
 *   deadline  — savings goal target date
 *   billing   — subscription billing occurrence (recurring, projected forward)
 *   planned   — planned expense the user has scheduled
 *   expense   — expense already logged
 *   budget    — monthly budget reset reminder
 *
 * The horizon limits how far recurring billing is projected into the future.
 */
import { addMonthsIso, daysUntil, dueStatus, parseIsoDate, toIsoDate } from './calendar'

const DEFAULT_HORIZON_MONTHS = 6

/** Build every derived calendar event, sorted by date then kind priority. */
export function deriveCalendarEvents({ goals = [], subscriptions = [], plannedExpenses = [], expenses = [], horizonMonths = DEFAULT_HORIZON_MONTHS, today = new Date() }) {
  const events = []

  /* Savings goal target dates */
  for (const goal of goals) {
    if (!goal.targetDate) continue
    events.push({
      id: `deadline-${goal.id}`,
      kind: 'deadline',
      date: goal.targetDate,
      title: `Savings target: ${goal.name}`,
      subtitle: goal.note || 'Savings goal target date',
      amount: goal.target,
      amountLabel: `${formatAmount(goal.saved)} of ${formatAmount(goal.target)} saved`,
      detailRoute: '/goals',
      detailId: goal.id,
    })
  }

  /* Subscription billing — project each recurring charge across the horizon */
  for (const sub of subscriptions) {
    if (!sub.nextBillingDate) continue
    const occurrences = billingOccurrences(sub.nextBillingDate, sub.billingCycle, horizonMonths, today)
    occurrences.forEach((iso, index) => {
      events.push({
        id: index === 0 ? `billing-${sub.id}` : `billing-${sub.id}-${iso}`,
        kind: 'billing',
        date: iso,
        title: sub.name,
        subtitle: `Subscription billing · ${sub.billingCycle} · ${index === 0 ? 'next charge' : 'projected'}`,
        amount: sub.amount,
        amountLabel: `${formatAmount(sub.amount)} per ${sub.billingCycle === 'monthly' ? 'month' : sub.billingCycle === 'quarterly' ? 'quarter' : 'year'}`,
        detailRoute: '/subscriptions',
        detailId: sub.id,
      })
    })
  }

  /* Planned (upcoming) expenses */
  for (const planned of plannedExpenses) {
    if (!planned.date) continue
    events.push({
      id: `planned-${planned.id}`,
      kind: 'planned',
      date: planned.date,
      title: planned.name,
      subtitle: `Planned expense · ${planned.category}`,
      amount: planned.amount,
      amountLabel: `${formatAmount(planned.amount)} planned in ${planned.category}`,
      detailRoute: '/calendar',
      detailId: planned.id,
    })
  }

  /* Logged expenses (context on the day they happened) */
  for (const expense of expenses) {
    if (!expense.date) continue
    events.push({
      id: `expense-${expense.id}`,
      kind: 'expense',
      date: expense.date,
      title: expense.name,
      subtitle: `Logged expense · ${expense.category}`,
      amount: expense.amount,
      amountLabel: `${formatAmount(expense.amount)} spent in ${expense.category}`,
      detailRoute: '/expenses',
      detailId: expense.id,
    })
  }

  /* Monthly budget reset — current month and next month only, to keep the
     agenda focused on decisions rather than repeating boilerplate. */
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  for (let i = 0; i < 2; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    events.push({
      id: `budget-${toIsoDate(d)}`,
      kind: 'budget',
      date: toIsoDate(d),
      title: 'Monthly budget resets',
      subtitle: 'A fresh start for the new month',
      amount: null,
      amountLabel: null,
      detailRoute: '/overview',
      detailId: null,
    })
  }

  /* Annotate with day math and sort chronologically */
  return events
    .map((event) => {
      const days = daysUntil(event.date, today)
      return { ...event, daysRemaining: days, status: dueStatus(days) }
    })
    .sort((a, b) => a.date.localeCompare(b.date) || kindPriority(a.kind) - kindPriority(b.kind))
}

/**
 * Billing occurrences for one subscription across the horizon, including any
 * occurrence that already passed this cycle (shown as "date passed", calmly).
 */
function billingOccurrences(nextBillingDate, billingCycle, horizonMonths, today) {
  const stepMonths = { monthly: 1, quarterly: 3, yearly: 12 }[billingCycle] ?? 1
  const occurrences = []

  // Walk backwards at most one step to catch a date that just passed.
  let cursor = nextBillingDate
  if (parseIsoDate(nextBillingDate) < startOfToday(today)) {
    cursor = addMonthsIso(nextBillingDate, stepMonths)
  }

  const horizonDate = new Date(today.getFullYear(), today.getMonth() + horizonMonths + 1, 0)
  let guard = 0
  while (parseIsoDate(cursor) <= horizonDate && guard < 24) {
    occurrences.push(cursor)
    cursor = addMonthsIso(cursor, stepMonths)
    guard += 1
  }
  return occurrences
}

function startOfToday(today) {
  const d = new Date(today)
  d.setHours(0, 0, 0, 0)
  return d
}

function kindPriority(kind) {
  const order = { billing: 0, deadline: 1, planned: 2, expense: 3, budget: 4 }
  return order[kind] ?? 9
}

function formatAmount(value) {
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* ------------------------------- rollups -------------------------------- */

/** Group events into overdue / next 7 days / later buckets. */
export function bucketEvents(events) {
  const buckets = { overdue: [], soon: [], upcoming: [] }
  for (const event of events) {
    if (event.status === 'overdue') buckets.overdue.push(event)
    else if (event.status === 'today' || event.status === 'soon') buckets.soon.push(event)
    else buckets.upcoming.push(event)
  }
  return buckets
}

/** Next N events that have not passed yet. */
export function nextUpcoming(events, count = 5) {
  return events.filter((event) => event.status !== 'overdue').slice(0, count)
}

/** Sum of billing amounts due within the next `days` days. */
export function billingDueWithin(events, days = 7) {
  return events
    .filter((event) => event.kind === 'billing' && event.daysRemaining >= 0 && event.daysRemaining <= days)
    .reduce((total, event) => total + event.amount, 0)
}
