import { useCallback, useMemo } from 'react'
import { useLocalStorageState } from './useLocalStorageState'
import {
  DEMO_ADVISOR_TIPS,
  DEMO_DEALS,
  DEMO_EXPENSES,
  DEMO_GHOST_CONVERSATION,
  DEMO_GOALS,
  DEMO_LESSONS,
  DEMO_PLANNED_EXPENSES,
  DEMO_PRODUCTS,
  DEMO_PROFILE,
  DEMO_SUBSCRIPTIONS,
  EXPENSE_CATEGORIES,
} from '../data/mockData'
import { deriveOverview, monthlyNet, roundMoney, upcomingRenewals } from '../lib/finance'

const STORAGE_VERSION = 'v2'

/**
 * Central state for the GhostFinEx prototype.
 *
 * Editable values (profile, expenses, goals, subscriptions) persist to
 * localStorage and are seeded from DEMO_* mock data on first load. Static
 * reference content (lessons, demo products, tips) stays in memory and is
 * NOT persisted — it is mock content, not user data.
 */
export function useFinanceState() {
  const [profile, setProfile] = useLocalStorageState(`${STORAGE_VERSION}.profile`, DEMO_PROFILE)
  const [expenses, setExpenses] = useLocalStorageState(`${STORAGE_VERSION}.expenses`, DEMO_EXPENSES)
  const [goals, setGoals] = useLocalStorageState(`${STORAGE_VERSION}.goals`, DEMO_GOALS)
  const [subscriptions, setSubscriptions] = useLocalStorageState(`${STORAGE_VERSION}.subscriptions`, DEMO_SUBSCRIPTIONS)
  const [plannedExpenses, setPlannedExpenses] = useLocalStorageState(`${STORAGE_VERSION}.plannedExpenses`, DEMO_PLANNED_EXPENSES)
  const [activityLog, setActivityLog] = useLocalStorageState(`${STORAGE_VERSION}.activity`, [])

  // Reference content — mock/demo, NOT user data, never persisted.
  const lessons = DEMO_LESSONS
  const products = DEMO_PRODUCTS
  const deals = DEMO_DEALS
  const advisorTips = DEMO_ADVISOR_TIPS
  const ghostDemoConversation = DEMO_GHOST_CONVERSATION
  const categories = EXPENSE_CATEGORIES

  /* ------------------------------- derived ------------------------------- */
  const overview = useMemo(
    () => deriveOverview({ profile, expenses }),
    [profile, expenses],
  )
  const net = useMemo(() => monthlyNet(profile.monthlyIncome, profile.monthlyBudget), [profile])
  const renewals = useMemo(() => upcomingRenewals(subscriptions, 6), [subscriptions])

  /**
   * Append an activity entry. Entries are generated from real user actions
   * (add/remove expense, goal deposit, subscription changes) so the feed
   * reflects what actually happened in the app. Newest first, capped.
   */
  const logActivity = useCallback(
    (kind, label, detail, tone = 'neutral') => {
      setActivityLog((prev) =>
        [
          {
            id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            date: new Date().toISOString().slice(0, 10),
            kind,
            label,
            detail,
            tone,
          },
          ...prev,
        ].slice(0, 30),
      )
    },
    [setActivityLog],
  )

  /* ------------------------------- profile ------------------------------- */
  const updateProfile = useCallback(
    (patch) => setProfile((prev) => ({ ...prev, ...patch })),
    [setProfile],
  )
  const setIncome = useCallback(
    (value) => setProfile((prev) => ({ ...prev, monthlyIncome: roundMoney(Math.max(0, value)) })),
    [setProfile],
  )
  const setBalance = useCallback(
    (value) => setProfile((prev) => ({ ...prev, availableBalance: roundMoney(Math.max(0, value)) })),
    [setProfile],
  )
  const setBudget = useCallback(
    (value) => setProfile((prev) => ({ ...prev, monthlyBudget: roundMoney(Math.max(0, value)) })),
    [setProfile],
  )

  /* ------------------------------- expenses ------------------------------ */
  const addExpense = useCallback(
    (expense) => {
      setExpenses((prev) => [{ id: `exp-user-${Date.now()}`, ...expense }, ...prev])
      logActivity('expense', `Expense added — ${expense.name}`, formatDetail(expense.amount), 'neutral')
    },
    [setExpenses, logActivity],
  )
  const removeExpense = useCallback(
    (expenseId) => {
      setExpenses((prev) => {
        const target = prev.find((e) => e.id === expenseId)
        if (target) logActivity('expense', `Expense removed — ${target.name}`, `−${formatDetail(target.amount)}`, 'neutral')
        return prev.filter((e) => e.id !== expenseId)
      })
    },
    [setExpenses, logActivity],
  )

  /* -------------------------------- goals -------------------------------- */
  const addGoal = useCallback(
    (goal) => {
      setGoals((prev) => [...prev, { id: `goal-user-${Date.now()}`, saved: 0, ...goal }])
      logActivity('goal', `Goal created — ${goal.name}`, `target ${formatDetail(goal.target)}`, 'accent')
    },
    [setGoals, logActivity],
  )
  const updateGoal = useCallback(
    (goalId, patch) =>
      setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, ...patch } : g))),
    [setGoals],
  )
  const addToGoal = useCallback(
    (goalId, amount) => {
      setGoals((prev) => {
        const target = prev.find((g) => g.id === goalId)
        if (target) logActivity('goal', `Deposit to ${target.name}`, `+${formatDetail(amount)}`, 'accent')
        return prev.map((g) => (g.id === goalId ? { ...g, saved: roundMoney(g.saved + amount) } : g))
      })
    },
    [setGoals, logActivity],
  )
  const removeGoal = useCallback(
    (goalId) => {
      setGoals((prev) => {
        const target = prev.find((g) => g.id === goalId)
        if (target) logActivity('goal', `Goal removed — ${target.name}`, '—', 'neutral')
        return prev.filter((g) => g.id !== goalId)
      })
    },
    [setGoals, logActivity],
  )

  /* ----------------------------- subscriptions ---------------------------- */
  const addSubscription = useCallback(
    (sub) => {
      setSubscriptions((prev) => [...prev, { id: `sub-user-${Date.now()}`, ...sub }])
      logActivity('subscription', `Subscription added — ${sub.name}`, `${formatDetail(sub.amount)} / ${sub.billingCycle}`, 'info')
    },
    [setSubscriptions, logActivity],
  )
  const updateSubscription = useCallback(
    (subId, patch) =>
      setSubscriptions((prev) => prev.map((s) => (s.id === subId ? { ...s, ...patch } : s))),
    [setSubscriptions],
  )
  const removeSubscription = useCallback(
    (subId) => {
      setSubscriptions((prev) => {
        const target = prev.find((s) => s.id === subId)
        if (target) logActivity('subscription', `Subscription removed — ${target.name}`, '—', 'neutral')
        return prev.filter((s) => s.id !== subId)
      })
    },
    [setSubscriptions, logActivity],
  )

  /* --------------------------- planned expenses --------------------------- */
  const addPlannedExpense = useCallback(
    (planned) => {
      setPlannedExpenses((prev) => [...prev, { id: `plan-user-${Date.now()}`, ...planned }])
      logActivity('planned', `Planned expense — ${planned.name}`, formatDetail(planned.amount), 'info')
    },
    [setPlannedExpenses, logActivity],
  )
  const updatePlannedExpense = useCallback(
    (plannedId, patch) =>
      setPlannedExpenses((prev) => prev.map((p) => (p.id === plannedId ? { ...p, ...patch } : p))),
    [setPlannedExpenses],
  )
  const removePlannedExpense = useCallback(
    (plannedId) => {
      setPlannedExpenses((prev) => {
        const target = prev.find((p) => p.id === plannedId)
        if (target) logActivity('planned', `Planned expense removed — ${target.name}`, '—', 'neutral')
        return prev.filter((p) => p.id !== plannedId)
      })
    },
    [setPlannedExpenses, logActivity],
  )
  /**
   * Mark a planned expense as paid: converts it into a real logged expense
   * and removes the plan. Deterministic, single-source-of-truth transfer.
   */
  const payPlannedExpense = useCallback(
    (plannedId) => {
      setPlannedExpenses((prev) => {
        const target = prev.find((p) => p.id === plannedId)
        if (!target) return prev
        setExpenses((current) => [
          { id: `exp-user-${Date.now()}`, name: target.name, amount: target.amount, category: target.category, date: new Date().toISOString().slice(0, 10) },
          ...current,
        ])
        logActivity('planned', `Paid planned expense — ${target.name}`, formatDetail(target.amount), 'accent')
        return prev.filter((p) => p.id !== plannedId)
      })
    },
    [setPlannedExpenses, setExpenses, logActivity],
  )

  /** Reset every persisted value back to the demo seed. */
  const resetToDemoData = useCallback(() => {
    setProfile(DEMO_PROFILE)
    setExpenses(DEMO_EXPENSES)
    setGoals(DEMO_GOALS)
    setSubscriptions(DEMO_SUBSCRIPTIONS)
    setPlannedExpenses(DEMO_PLANNED_EXPENSES)
    setActivityLog([])
  }, [setProfile, setExpenses, setGoals, setSubscriptions, setPlannedExpenses, setActivityLog])

  return {
    // persisted state
    profile,
    expenses,
    goals,
    subscriptions,
    plannedExpenses,
    activityLog,
    // reference content (mock, not persisted)
    lessons,
    products,
    deals,
    advisorTips,
    ghostDemoConversation,
    categories,
    // derived
    overview,
    net,
    renewals,
    // actions
    updateProfile,
    setIncome,
    setBalance,
    setBudget,
    addExpense,
    removeExpense,
    addGoal,
    updateGoal,
    addToGoal,
    removeGoal,
    addSubscription,
    updateSubscription,
    removeSubscription,
    addPlannedExpense,
    updatePlannedExpense,
    removePlannedExpense,
    payPlannedExpense,
    resetToDemoData,
  }
}

function formatDetail(value) {
  return `R ${roundMoney(value).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
