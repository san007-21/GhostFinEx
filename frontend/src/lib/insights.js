/**
 * insights.js — deterministic, rule-based insights over user-entered data.
 *
 * No AI, no network: every insight is a local rule. Each entry carries a
 * severity and an optional action route the UI can deep-link to, so
 * observations always lead somewhere the user can act. Used by both the
 * Dashboard and the Ghost assistant.
 */
import { formatCurrency } from './format'
import {
  normalizeToMonthly,
  roundMoney,
  unallocatedIncome,
  weeklyAmountNeeded,
  weeksUntil,
} from './finance'

/**
 * Build insights. Expects { profile, budgetLines, goals, subscriptions,
 * totals } — the same finance-state shape used across the app.
 */
export function buildInsights({ profile, budgetLines, goals, subscriptions, totals }) {
  const insights = []
  const freeIncome = roundMoney(profile.monthlyIncome - totals.spent)

  const push = (severity, title, detail, route, kind = 'review') =>
    insights.push({ id: `${kind}-${insights.length}`, severity, title, detail, route })

  /* Plan health */
  const unallocated = unallocatedIncome(profile.monthlyIncome, budgetLines)
  if (unallocated < 0) {
    push(
      'warn',
      'Your plan commits more than your income',
      `Planned spending is ${formatCurrency(Math.abs(unallocated), { compact: true })} over income. Trim a category or move the plan closer to reality.`,
      '/budget',
      'plan',
    )
  } else if (unallocated === 0) {
    push(
      'accent',
      'Every rand has a job',
      'Planned amounts exactly match income — zero-based budgeting achieved. Watch actual spending against the plan.',
      '/budget',
      'plan',
    )
  } else {
    push(
      'info',
      'You have unallocated income',
      `${formatCurrency(unallocated, { compact: true })} is not yet planned. Savings is a valid destination, not just "left over".`,
      '/budget',
      'plan',
    )
  }

  /* Spending vs plan */
  if (totals.overBudget) {
    push(
      'danger',
      'Spending has passed the plan',
      `${formatCurrency(totals.spent, { compact: true })} spent of ${formatCurrency(totals.planned, { compact: true })} planned. Adjust the plan or hold back for the rest of the month.`,
      '/expenses',
      'spending',
    )
  } else if (totals.utilization > 0.85) {
    push(
      'warn',
      'Close to the plan ceiling',
      `${formatPercent(totals.utilization)} of planned amounts spent — the rest of the month needs to stay lean.`,
      '/expenses',
      'spending',
    )
  }

  /* Overspent categories */
  const overspent = budgetLines
    .filter((line) => line.spent > line.planned)
    .sort((a, b) => b.spent - b.planned - (a.spent - a.planned))
  if (overspent.length > 0) {
    push(
      'warn',
      `${overspent.length} categor${overspent.length === 1 ? 'y is' : 'ies are'} over plan`,
      `${overspent[0].category} leads: ${formatCurrency(overspent[0].spent, { compact: true })} vs ${formatCurrency(overspent[0].planned, { compact: true })} planned.`,
      '/spending',
      'spending',
    )
  }

  /* Goals needing attention */
  for (const goal of goals) {
    const weeks = weeksUntil(goal.deadline)
    const weeklyNeed = weeklyAmountNeeded(goal.target, goal.saved, weeks)
    if (weeklyNeed === 0) continue
    if (weeklyNeed * 4.33 > freeIncome) {
      push(
        'info',
        `"${goal.name}" needs ${formatCurrency(weeklyNeed, { compact: true })} per week`,
        `${formatCurrency(goal.target - goal.saved, { compact: true })} to go in ${weeks} weeks. If that weekly number is out of reach, moving the deadline is a valid choice.`,
        '/goals',
        'goal',
      )
      break // one goal nudge is enough on the dashboard
    }
  }

  /* Subscriptions */
  const lowUse = subscriptions.filter((s) => s.usesPerMonth <= 2)
  if (lowUse.length > 0) {
    const monthly = roundMoney(
      lowUse.reduce((sum, s) => sum + normalizeToMonthly(s.amount, s.billingCycle), 0),
    )
    push(
      'info',
      `${lowUse.length} subscription${lowUse.length === 1 ? ' is' : 's are'} barely used`,
      `${lowUse.map((s) => s.name).join(', ')} — ${formatCurrency(monthly, { compact: true })}/month combined. That is ${formatCurrency(roundMoney(monthly * 12), { compact: true })} a year toward whatever you choose.`,
      '/subscriptions',
      'subscription',
    )
  }

  const highCpu = subscriptions
    .map((s) => ({ ...s, monthly: normalizeToMonthly(s.amount, s.billingCycle) }))
    .map((s) => ({ ...s, cpu: s.usesPerMonth > 0 ? roundMoney(s.monthly / s.usesPerMonth) : null }))
    .filter((s) => s.cpu !== null && s.cpu > 50)
  if (highCpu.length > 0) {
    push(
      'info',
      'High cost per use detected',
      highCpu.map((s) => `${s.name} at ${formatCurrency(s.cpu, { compact: true })}/use`).join(', '),
      '/subscriptions',
      'subscription',
    )
  }

  if (insights.length === 0) {
    push(
      'accent',
      'Nothing flagged right now',
      'Plan, spending, goals, and subscriptions all look steady. Revisit after your next big expense or at month end.',
      '/dashboard',
      'review',
    )
  }

  return insights
}

function formatPercent(ratio) {
  return `${Math.round(ratio * 100)}%`
}
