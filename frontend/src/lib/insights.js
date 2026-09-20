/**
 * insights.js — deterministic, rule-based insights over user-entered data.
 *
 * No AI, no network: every insight is a local rule. Each entry carries a
 * severity and an optional action route the UI can deep-link to, so
 * observations always lead somewhere the user can act. Used by the Dashboard
 * and the Ghost assistant.
 */
import { formatCurrency } from './format'
import {
  roundMoney,
  subscriptionBurden,
} from './finance'

/**
 * Build insights. Expects the finance-state shape: { profile, expenses,
 * goals, subscriptions, overview }.
 */
export function buildInsights({ profile, expenses, goals, subscriptions, overview }) {
  const insights = []

  const push = (severity, title, detail, route, kind = 'review') =>
    insights.push({ id: `${kind}-${insights.length}`, severity, title, detail, route })

  /* Budget health */
  if (overview.overBudget) {
    push(
      'danger',
      'You are over budget',
      `Spending is ${formatCurrency(Math.abs(overview.budgetRemaining), { compact: true })} past your ${formatCurrency(profile.monthlyBudget, { compact: true })} budget. The breakdown shows where it went.`,
      '/spending',
      'budget',
    )
  } else if (overview.budgetUsed > 0.85) {
    push(
      'warn',
      'Close to the budget ceiling',
      `${Math.round(overview.budgetUsed * 100)}% of your budget is spent — the rest of the month needs to stay lean.`,
      '/spending',
      'budget',
    )
  } else if (overview.totalSpent > 0) {
    push(
      'accent',
      'Spending is inside budget',
      `${formatCurrency(overview.budgetRemaining, { compact: true })} of budget remains (${Math.round(overview.budgetUsed * 100)}% used).`,
      '/spending',
      'budget',
    )
  }

  /* Balance warnings */
  if (overview.remainingBalance < 0) {
    push(
      'danger',
      'Balance is negative',
      `After logged expenses, ${formatCurrency(overview.remainingBalance, { compact: true })} remains of your available balance. Check for expenses logged in error or plan a top-up.`,
      '/expenses',
      'balance',
    )
  } else if (overview.availableBalance > 0 && overview.remainingBalance / overview.availableBalance < 0.2) {
    push(
      'warn',
      'Balance is running low',
      `Only ${formatCurrency(overview.remainingBalance, { compact: true })} of your ${formatCurrency(profile.availableBalance, { compact: true })} balance is left after this month's spending.`,
      '/expenses',
      'balance',
    )
  }

  /* Biggest category */
  const byCategory = expensesByCategorySorted(expenses)
  if (byCategory.length > 0 && overview.totalSpent > 0) {
    push(
      'info',
      `${byCategory[0].category} is your biggest category`,
      `${formatCurrency(byCategory[0].total, { compact: true })} — ${Math.round((byCategory[0].total / overview.totalSpent) * 100)}% of all spending this month.`,
      '/spending',
      'spending',
    )
  }

  /* Goals needing attention */
  for (const goal of goals) {
    if (goal.saved >= goal.target) continue
    const gap = roundMoney(goal.target - goal.saved)
    const weeks = Math.max(1, Math.ceil((new Date(goal.targetDate) - new Date()) / (7 * 24 * 60 * 60 * 1000)))
    const weekly = roundMoney(gap / weeks)
    if (weekly * 4.33 > Math.max(overview.monthlyIncome - overview.totalSpent, 0)) {
      push(
        'info',
        `"${goal.name}" needs ${formatCurrency(weekly, { compact: true })} per week`,
        `${formatCurrency(gap, { compact: true })} to go in ${weeks} weeks. If that weekly number is out of reach, moving the target date is a valid choice.`,
        '/goals',
        'goal',
      )
      break // one goal nudge is enough
    }
  }

  /* Subscriptions */
  const burden = subscriptionBurden(subscriptions, profile.monthlyIncome, profile.monthlyBudget)
  if (subscriptions.length > 0 && burden.shareOfIncome > 0.15) {
    push(
      'warn',
      'Subscriptions take a big slice',
      `${formatCurrency(burden.monthly, { compact: true })}/month is ${Math.round(burden.shareOfIncome * 100)}% of income (${formatCurrency(burden.yearly, { compact: true })}/year). The Subscriptions view can simulate cuts.`,
      '/subscriptions',
      'subscription',
    )
  }

  if (insights.length === 0) {
    push(
      'accent',
      'Nothing flagged right now',
      'Balance, budget, goals, and subscriptions all look steady. Revisit after your next big expense.',
      '/dashboard',
      'review',
    )
  }

  return insights
}

function expensesByCategorySorted(expenses) {
  const map = new Map()
  for (const expense of expenses) {
    map.set(expense.category, roundMoney((map.get(expense.category) ?? 0) + expense.amount))
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({ category, total }))
}
