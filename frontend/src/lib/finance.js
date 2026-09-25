/**
 * finance.js — deterministic financial calculations for GhostFinEx.
 *
 * This module is the single source of truth for all money math in the app.
 * Every function is pure: same inputs → same outputs, no randomness, no
 * network, no AI. UI components must never compute money inline; they call
 * these functions.
 *
 * Core model: a user has an available balance, a monthly income, a monthly
 * budget, and a ledger of expenses. All derived values flow from those.
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

/* -------------------------------- expenses -------------------------------- */

/** Total of an expense ledger. */
export function sumExpenses(expenses) {
  return sumAmounts(expenses.map((e) => e.amount))
}

/** { category: total } for an expense ledger, sorted descending by total. */
export function expensesByCategory(expenses) {
  const byCategory = new Map()
  for (const expense of expenses) {
    byCategory.set(expense.category, roundMoney((byCategory.get(expense.category) ?? 0) + expense.amount))
  }
  return [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({ category, total }))
}

/**
 * Parse 'YYYY-MM-DD' as LOCAL calendar parts. new Date('YYYY-MM-DD') parses
 * as UTC midnight, which can shift the day (and even the month) in timezones
 * away from UTC — month filtering must never depend on the viewer's zone.
 */
function parseIsoDay(iso) {
  const [year, month, day] = String(iso).split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Expenses that fall in the same calendar month as `reference` (default now). */
export function expensesInMonth(expenses, reference = new Date()) {
  return expenses.filter((expense) => {
    if (!expense.date) return false
    const d = parseIsoDay(expense.date)
    return (
      d.getMonth() === reference.getMonth() &&
      d.getFullYear() === reference.getFullYear()
    )
  })
}

/* ------------------------- overview derived values ------------------------ */

/**
 * The central derived snapshot for the whole app. Every view reads the same
 * numbers from here so nothing can drift out of sync.
 *
 * SOURCE-OF-TRUTH MODEL (explicit):
 * - profile.availableBalance = sum of ACCOUNT balances = money currently held.
 *   Accounts are manually maintained current balances; the expense ledger is a
 *   parallel record and is NEVER subtracted from them again here (that would
 *   double-count spending already reflected in the balance the user maintains).
 * - totalSpent = ALL-TIME ledger total (ledger history).
 * - monthSpent = THIS calendar month's ledger total — the only spending figure
 *   that may be compared with monthly budget/income.
 * - budgetRemaining / budgetUsed / overBudget / savingsThisMonth are MONTHLY
 *   concepts and use monthSpent only.
 * - projectedEndOfMonth = money now + (income − budget): where the balance
 *   lands if the rest of the month goes exactly to plan. It is a projection,
 *   not a current balance.
 * Pass `reference` to pin the month (tests); defaults to now.
 */
export function deriveOverview({ profile, expenses }, reference = new Date()) {
  const totalSpent = sumExpenses(expenses)
  const monthExpenses = expensesInMonth(expenses, reference)
  const monthSpent = sumAmounts(monthExpenses.map((e) => e.amount))
  const availableBalance = roundMoney(profile.availableBalance)
  const budgetRemaining = roundMoney(profile.monthlyBudget - monthSpent)
  const budgetUsed = profile.monthlyBudget > 0 ? monthSpent / profile.monthlyBudget : 0
  return {
    monthlyIncome: profile.monthlyIncome,
    availableBalance,
    monthlyBudget: profile.monthlyBudget,
    totalSpent,
    monthSpent,
    monthExpenseCount: monthExpenses.length,
    budgetRemaining,
    budgetUsed,
    overBudget: budgetRemaining < 0,
    savingsThisMonth: roundMoney(profile.monthlyIncome - monthSpent),
    projectedEndOfMonth: roundMoney(availableBalance + monthlyNet(profile.monthlyIncome, profile.monthlyBudget)),
  }
}

/* ------------------------------ savings goals ----------------------------- */

/**
 * Weekly amount still needed to hit a goal by its deadline.
 */
export function weeklyAmountNeeded(target, saved, weeksLeft) {
  const gap = roundMoney(target - saved)
  if (gap <= 0 || weeksLeft <= 0) return 0
  return roundMoney(gap / weeksLeft)
}

export function weeksUntil(date, from = new Date()) {
  if (!date) return 0
  const target = new Date(date)
  if (Number.isNaN(target.getTime())) return 0
  const diff = target.getTime() - from.getTime()
  if (diff <= 0) return 0
  return Math.max(1, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)))
}

/** Derived goal stats: progress ratio, remaining amount, percentage. */
export function goalStats(goal) {
  const remaining = roundMoney(Math.max(0, goal.target - goal.saved))
  const percent = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0
  const weeks = weeksUntil(goal.targetDate)
  return {
    remaining,
    percent,
    isComplete: goal.saved >= goal.target,
    weeksLeft: weeks,
    weeklyNeeded: weeklyAmountNeeded(goal.target, goal.saved, weeks),
  }
}

/* ----------------------------- subscriptions ----------------------------- */

export function normalizeToMonthly(amount, billingCycle) {
  const factors = { monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }
  const factor = factors[billingCycle]
  if (factor === undefined) throw new Error(`Unknown billing cycle: ${billingCycle}`)
  return roundMoney(amount * factor)
}

/** Total normalized monthly cost of all subscriptions — "subscription burden". */
export function monthlySubscriptionCost(subscriptions) {
  return sumAmounts(subscriptions.map((sub) => normalizeToMonthly(sub.amount, sub.billingCycle)))
}

export function yearlySubscriptionCost(subscriptions) {
  return roundMoney(monthlySubscriptionCost(subscriptions) * 12)
}

/** Burden as a share of income and of budget. */
export function subscriptionBurden(subscriptions, monthlyIncome, monthlyBudget) {
  const monthly = monthlySubscriptionCost(subscriptions)
  return {
    monthly,
    yearly: roundMoney(monthly * 12),
    shareOfIncome: monthlyIncome > 0 ? monthly / monthlyIncome : 0,
    shareOfBudget: monthlyBudget > 0 ? monthly / monthlyBudget : 0,
  }
}

/** Cost per use for a subscription (uses per month entered by the user). */
export function costPerUse(monthlyCost, usesPerMonth) {
  if (!usesPerMonth || usesPerMonth <= 0) return null
  return roundMoney(monthlyCost / usesPerMonth)
}

/** Next N renewals sorted by next billing date. */
export function upcomingRenewals(subscriptions, count = 5) {
  return subscriptions
    .slice()
    .sort((a, b) => String(a.nextBillingDate).localeCompare(String(b.nextBillingDate)))
    .slice(0, count)
}

/* ------------------------------- affordability ----------------------------- */

/**
 * Deterministic affordability analysis for a one-off purchase.
 * Uses the user's real available balance, budget, and monthly saving capacity
 * (income − budget, at least the budget's unspent part is not assumed).
 */
export function affordabilityAnalysis({ price, availableBalance, monthlyBudget, monthlyIncome, monthlySaving }) {
  const priceSafe = Math.max(0, roundMoney(price))
  const remainingAfterPurchase = roundMoney(availableBalance - priceSafe)
  const fitsNow = remainingAfterPurchase >= 0
  const shareOfBalance = availableBalance > 0 ? priceSafe / availableBalance : null
  // Budget impact: buying now removes the same amount from this month's plan.
  const budgetImpact = {
    monthlyBudget: roundMoney(monthlyBudget),
    priceShare: monthlyBudget > 0 ? priceSafe / monthlyBudget : null,
    remainingAfter: roundMoney(monthlyBudget - priceSafe),
  }
  // Savings impact: months of typical saving the price equals.
  const savingCapacity = monthlySaving !== undefined && monthlySaving !== null
    ? monthlySaving
    : roundMoney(monthlyIncome - monthlyBudget)
  const monthsOfSaving = savingCapacity > 0 ? Math.ceil(priceSafe / savingCapacity) : null
  return {
    price: priceSafe,
    remainingAfterPurchase,
    fitsNow,
    shareOfBalance,
    budgetImpact,
    savingCapacity: roundMoney(savingCapacity),
    monthsOfSaving,
  }
}

/* ------------------------------ opportunity ------------------------------ */

/** Money freed per year by cancelling a subscription (annualized). */
export function annualSavingsFromCancellation(subscription) {
  return roundMoney(normalizeToMonthly(subscription.amount, subscription.billingCycle) * 12)
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

/**
 * Savings overview. Distinguishes explicit savings from leftover cash:
 * - contributionsThisMonth: real, recorded transfers into savings.
 * - leftoverCash: income − expenses — potential savings, NOT savings.
 * - totalSaved: money recorded as saved across goals.
 */
export function savingsOverview({ contributions, goals, net }, reference = new Date()) {
  const thisMonth = contributions.filter((c) => {
    if (!c.date) return false
    const [year, month, day] = String(c.date).split('-').map(Number)
    const d = new Date(year, month - 1, day) // local parse — see expensesInMonth
    return d.getMonth() === reference.getMonth() && d.getFullYear() === reference.getFullYear()
  })
  const contributionsThisMonth = sumAmounts(thisMonth.map((c) => c.amount))
  const contributedTotal = sumAmounts(contributions.map((c) => c.amount))
  const totalSaved = sumAmounts(goals.map((g) => g.saved))
  return {
    contributionsThisMonth,
    contributedTotal,
    totalSaved,
    leftoverCash: roundMoney(net),
    savingsRate: net > 0 ? Math.min(1, contributionsThisMonth / net) : 0,
  }
}

/* ------------------------------ what-if simulation ------------------------ */

/**
 * Apply a what-if scenario to the user's real financial state WITHOUT
 * mutating it. Returns a full derived overview for the hypothetical state.
 */
export function simulateScenario(state, scenario) {
  const { profile, expenses, subscriptions } = state

  let simExpenses = expenses
  let simProfile = profile
  let simSubscriptions = subscriptions
  const effects = []

  if (scenario.type === 'purchase' && scenario.price > 0) {
    const priceSafe = roundMoney(scenario.price)
    simExpenses = [
      { id: 'sim-purchase', name: scenario.name || 'Hypothetical purchase', amount: priceSafe, category: 'Shopping', date: new Date().toISOString().slice(0, 10) },
      ...expenses,
    ]
    // Buying now means paying now: the simulated balance drops by the price.
    // (Accounts are the balance truth; the ledger only records spending.)
    simProfile = { ...simProfile, availableBalance: roundMoney((simProfile.availableBalance ?? 0) - priceSafe) }
    effects.push(`Pays ${priceSafe} from your balance and logs it as this month's spending`)
  }

  if (scenario.type === 'expense' && scenario.amount > 0) {
    simExpenses = [
      { id: 'sim-expense', name: scenario.name || 'Hypothetical recurring expense', amount: roundMoney(scenario.amount), category: scenario.category || 'Other', date: new Date().toISOString().slice(0, 10) },
      ...expenses,
    ]
    effects.push(`Adds ${roundMoney(scenario.amount)} of spending in ${scenario.category || 'Other'}`)
  }

  if (scenario.type === 'saving' && scenario.amount > 0) {
    simProfile = { ...profile, monthlyIncome: roundMoney(profile.monthlyIncome - scenario.amount) }
    effects.push(`Redirects ${roundMoney(scenario.amount)}/month of income to savings`)
  }

  if (scenario.type === 'cancellation' && scenario.subscriptionId) {
    const target = subscriptions.find((s) => s.id === scenario.subscriptionId)
    if (target) {
      simSubscriptions = subscriptions.filter((s) => s.id !== scenario.subscriptionId)
      effects.push(`Cancels "${target.name}" (${roundMoney(normalizeToMonthly(target.amount, target.billingCycle))}/month freed)`)
    }
  }

  const overview = deriveOverview({ profile: simProfile, expenses: simExpenses })
  return {
    effects,
    overview,
    expenses: simExpenses,
    profile: simProfile,
    subscriptions: simSubscriptions,
  }
}

/** Monthly net = income − budget (the plan for the month). */
export function monthlyNet(monthlyIncome, monthlyBudget) {
  return roundMoney(monthlyIncome - monthlyBudget)
}

/**
 * Project a running balance forward. monthlyNet may be negative; the
 * projection is honest and shows overdrafts rather than clipping at zero.
 */
export function projectBalance(startBalance, monthlyNetValue, months) {
  const path = [roundMoney(startBalance)]
  let balance = startBalance
  for (let i = 0; i < months; i += 1) {
    balance = roundMoney(balance + monthlyNetValue)
    path.push(balance)
  }
  return path
}
