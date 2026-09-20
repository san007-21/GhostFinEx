/**
 * finance.js — deterministic financial calculations for GhostFinEx.
 *
 * This module is the single source of truth for all money math in the app.
 * Every function is pure: same inputs → same outputs, no randomness, no
 * network, no AI. UI components must never compute money inline; they call
 * these functions.
 */

/* ---------------------------------- core --------------------------------- */

/** Round a monetary value to 2 decimals in a deterministic way. */
export function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Sum a list of amounts. */
export function sumAmounts(amounts) {
  return roundMoney(amounts.reduce((total, amount) => total + amount, 0))
}

/**
 * Budget totals for a list of budget lines with { category, planned, spent }.
 */
export function sumBudget(lines) {
  const planned = sumAmounts(lines.map((l) => l.planned))
  const spent = sumAmounts(lines.map((l) => l.spent))
  return {
    planned,
    spent,
    remaining: roundMoney(planned - spent),
    utilization: planned > 0 ? spent / planned : 0,
    overBudget: spent > planned,
  }
}

/**
 * Remaining income after budget spending. Intentionally does NOT clip to
 * zero — a negative result means overspend and must stay visible.
 */
export function remainingIncome(income, budgetLines) {
  return roundMoney(income - sumBudget(budgetLines).spent)
}

/**
 * Left-to-allocate: income minus *planned* amounts. Negative means the plan
 * itself is over-committed.
 */
export function unallocatedIncome(income, budgetLines) {
  return roundMoney(income - sumBudget(budgetLines).planned)
}

/** Generic progress toward a target, clamped to 0..1 for display. */
export function progressToward(current, target) {
  if (target <= 0) return 0
  return Math.min(1, Math.max(0, current / target))
}

/* ------------------------------ savings goals ---------------------------- */

/**
 * Weekly amount still needed to hit a goal by its deadline.
 */
export function weeklyAmountNeeded(target, saved, weeksLeft) {
  const gap = roundMoney(target - saved)
  if (gap <= 0 || weeksLeft <= 0) return 0
  return roundMoney(gap / weeksLeft)
}

export function weeksUntil(date, from = new Date()) {
  const target = new Date(date)
  const diff = target.getTime() - from.getTime()
  if (diff <= 0) return 0
  return Math.max(1, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)))
}

/* ----------------------------- subscriptions ----------------------------- */

/** Total monthly cost of subscriptions, normalizing billing cycles. */
export function monthlySubscriptionCost(subscriptions) {
  const monthly = subscriptions.map((sub) =>
    normalizeToMonthly(sub.amount, sub.billingCycle),
  )
  return sumAmounts(monthly)
}

export function yearlySubscriptionCost(subscriptions) {
  return roundMoney(monthlySubscriptionCost(subscriptions) * 12)
}

/** Cost per use for a subscription, e.g. streaming used 4×/month. */
export function costPerUse(monthlyCost, usesPerMonth) {
  if (!usesPerMonth || usesPerMonth <= 0) return null
  return roundMoney(monthlyCost / usesPerMonth)
}

export function normalizeToMonthly(amount, billingCycle) {
  const factors = { monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }
  const factor = factors[billingCycle]
  if (factor === undefined) throw new Error(`Unknown billing cycle: ${billingCycle}`)
  return roundMoney(amount * factor)
}

/* --------------------------------- loans --------------------------------- */

/**
 * Monthly payment for an amortizing loan (mortgage-style, works for student
 * loans). rate is annual percent, termYears the repayment period.
 * Standard annuity formula: P · r / (1 − (1+r)^−n), deterministic.
 */
export function loanMonthlyPayment(principal, annualRatePercent, termYears) {
  if (principal <= 0 || termYears <= 0) return 0
  const r = annualRatePercent / 100 / 12
  const n = termYears * 12
  if (r === 0) return roundMoney(principal / n)
  return roundMoney((principal * r) / (1 - Math.pow(1 + r, -n)))
}

/** Total paid over the life of the loan and the interest portion. */
export function loanTotals(principal, annualRatePercent, termYears) {
  const payment = loanMonthlyPayment(principal, annualRatePercent, termYears)
  const totalPaid = roundMoney(payment * termYears * 12)
  return { monthlyPayment: payment, totalPaid, totalInterest: roundMoney(totalPaid - principal) }
}

/* ------------------------------ affordability ---------------------------- */

/**
 * Simple affordability check used by the compare view: can a recurring monthly
 * cost fit under a share of free monthly income? The 50% guardrail is a
 * conservative heuristic — shown as guidance, never as a rule.
 */
export function affordability(freeMonthlyIncome, monthlyCost) {
  if (freeMonthlyIncome <= 0) {
    return { fits: false, shareOfIncome: null, verdict: 'No free income available' }
  }
  const shareOfIncome = monthlyCost / freeMonthlyIncome
  const fits = monthlyCost <= freeMonthlyIncome
  const verdict = !fits
    ? 'Exceeds free monthly income'
    : shareOfIncome <= 0.5
      ? 'Fits comfortably'
      : 'Fits, but consumes over half of free income'
  return { fits, shareOfIncome, verdict }
}

/* ------------------------------ opportunity ------------------------------ */

/** Money freed per year by cancelling a subscription (annualized). */
export function annualSavingsFromCancellation(subscription) {
  return roundMoney(
    normalizeToMonthly(subscription.amount, subscription.billingCycle) * 12,
  )
}

/** How many weeks of goal funding a yearly saving covers. */
export function weeksOfGoalCovered(yearlySaving, weeklyNeed) {
  if (!weeklyNeed || weeklyNeed <= 0) return null
  return Math.floor(yearlySaving / weeklyNeed)
}

/* -------------------------------- expenses -------------------------------- */

/** Total of an expense ledger. */
export function sumExpenses(expenses) {
  return sumAmounts(expenses.map((e) => e.amount))
}

/** { category: total } for an expense ledger, sorted descending. */
export function expensesByCategory(expenses) {
  const byCategory = new Map()
  for (const expense of expenses) {
    byCategory.set(expense.category, roundMoney((byCategory.get(expense.category) ?? 0) + expense.amount))
  }
  return [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({ category, total }))
}

/** Expenses that fall in the same calendar month as `reference` (default now). */
export function expensesInMonth(expenses, reference = new Date()) {
  return expenses.filter((expense) => {
    const d = new Date(expense.date)
    return (
      d.getMonth() === reference.getMonth() &&
      d.getFullYear() === reference.getFullYear()
    )
  })
}

/* --------------------------- can-i-afford planning ------------------------ */

/**
 * Savings plan for a purchase: how long to reach the price from what is
 * already saved, at a chosen monthly contribution.
 */
export function savingsPlan(price, alreadySaved, monthlySaving, freeMonthlyIncome) {
  const gap = roundMoney(price - alreadySaved)
  if (gap <= 0) {
    return { gap: 0, monthsNeeded: 0, shareOfFreeIncome: 0, verdict: 'Already affordable from savings' }
  }
  if (monthlySaving <= 0) {
    return { gap, monthsNeeded: null, shareOfFreeIncome: 0, verdict: 'Set a monthly contribution to see a plan' }
  }
  const monthsNeeded = Math.ceil(gap / monthlySaving)
  const shareOfFreeIncome = freeMonthlyIncome > 0 ? monthlySaving / freeMonthlyIncome : null
  let verdict
  if (shareOfFreeIncome === null) {
    verdict = 'No free income this month'
  } else if (shareOfFreeIncome <= 0.5) {
    verdict = 'Comfortable — under half of free monthly income'
  } else if (shareOfFreeIncome <= 1) {
    verdict = 'Tight — over half of free monthly income'
  } else {
    verdict = 'Not covered by free monthly income'
  }
  return { gap, monthsNeeded, shareOfFreeIncome, verdict }
}

/* ------------------------------ what-if simulation ------------------------ */

/**
 * Apply a what-if scenario to budget lines. Factors are multipliers, e.g.
 * { 'Rent & utilities': 0.9, 'Social & entertainment': 0.7 }. Categories not
 * listed keep their planned amount. Deterministic.
 */
export function applyScenario(budgetLines, factors) {
  return budgetLines.map((line) => ({
    ...line,
    planned: roundMoney(line.planned * (factors[line.category] ?? 1)),
  }))
}

/**
 * Project a running balance forward. monthlyNet may be negative; the
 * projection is honest and shows overdrafts rather than clipping at zero.
 */
export function projectBalance(startBalance, monthlyNet, months) {
  const path = [roundMoney(startBalance)]
  let balance = startBalance
  for (let i = 0; i < months; i += 1) {
    balance = roundMoney(balance + monthlyNet)
    path.push(balance)
  }
  return path
}

/** Monthly net = income − planned spending − extra commitments. */
export function monthlyNet(income, plannedSpending, extraMonthly = 0) {
  return roundMoney(income - plannedSpending - extraMonthly)
}
