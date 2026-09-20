/**
 * calendar.js — deterministic date/month helpers for the financial calendar.
 * Pure date arithmetic only; no data, no side effects.
 */

export const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Monday-first weekday index (0 = Mon … 6 = Sun). */
export function mondayFirstWeekday(date) {
  return (date.getDay() + 6) % 7
}

/**
 * Parse 'YYYY-MM-DD' as LOCAL midnight. new Date('YYYY-MM-DD') parses as UTC
 * and can shift the calendar day in timezones behind UTC, so we parse by hand.
 */
export function parseIsoDate(iso) {
  const [year, month, day] = String(iso).split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Format a Date as 'YYYY-MM-DD' using LOCAL calendar parts. */
export function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Whole days from `from` (default today) until the given ISO date. */
export function daysUntil(isoDate, from = new Date()) {
  const target = parseIsoDate(isoDate)
  const base = startOfDay(from)
  return Math.round((target.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Classification for a due date. 'overdue' means the date has passed — the
 * wording used in the UI stays neutral ("Date passed"), never alarmist.
 */
export function dueStatus(days) {
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 7) return 'soon'
  return 'upcoming'
}

/** Human wording for a day count, kept calm and factual. */
export function dueLabel(days) {
  if (days < 0) return 'Date passed'
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days <= 13) return `Due in ${days} days`
  if (days <= 56) return `In ${Math.ceil(days / 7)} weeks`
  return `In ${Math.round(days / 30.4)} months`
}

/** Add whole months to an ISO date, returning an ISO date. */
export function addMonthsIso(isoDate, months) {
  const d = parseIsoDate(isoDate)
  d.setMonth(d.getMonth() + months)
  return toIsoDate(d)
}

/** Number of days in a month (month is 1-based). */
export function daysInMonth(year, month1based) {
  return new Date(year, month1based, 0).getDate()
}

/**
 * Build a 6×7 Monday-first grid for a month. Cells are null padding outside
 * the month, or { day, date } with an ISO date string.
 */
export function monthGrid(year, month1based) {
  const first = new Date(year, month1based - 1, 1)
  const lead = mondayFirstWeekday(first)
  const total = daysInMonth(year, month1based)
  const cells = []
  for (let i = 0; i < lead; i += 1) cells.push(null)
  for (let day = 1; day <= total; day += 1) {
    const iso = `${year}-${String(month1based).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, iso })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Group events by ISO date into a Map for O(1) lookup while rendering. */
export function groupEventsByDate(events) {
  const byDate = new Map()
  for (const event of events) {
    if (!byDate.has(event.date)) byDate.set(event.date, [])
    byDate.get(event.date).push(event)
  }
  return byDate
}

/** Last N months as { year, month, label } ending at `reference` (default now). */
export function recentMonths(count, reference = new Date()) {
  const months = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: MONTH_LABELS[d.getMonth()] })
  }
  return months
}

/** 'Sat 12 Sept' style label. */
export function shortDayLabel(dateString) {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
