import { useCallback, useMemo } from 'react'
import { useLocalStorageState } from './useLocalStorageState'
import {
  DEMO_ACTIVITY,
  DEMO_ADVISOR_TIPS,
  DEMO_BUDGET_LINES,
  DEMO_COMPARISON_OPTIONS,
  DEMO_DEALS,
  DEMO_EXPENSES,
  DEMO_GOALS,
  DEMO_LESSONS,
  DEMO_PROFILE,
  DEMO_RENEWALS,
  DEMO_SHOPPING_ITEMS,
  DEMO_SUBSCRIPTIONS,
} from '../data/mockData'
import { roundMoney, sumBudget, unallocatedIncome } from '../lib/finance'

/**
 * Central state for the GhostFinEx prototype.
 *
 * Editable values (income, budget, goals, subscriptions) persist to
 * localStorage and are seeded from DEMO_* mock data on first load. Static
 * reference content (lessons, comparison options, tips) stays in memory and
 * is NOT persisted — it is mock content, not user data.
 */
export function useFinanceState() {
  const [profile, setProfile] = useLocalStorageState('profile', DEMO_PROFILE)
  const [budgetLines, setBudgetLines] = useLocalStorageState('budget', DEMO_BUDGET_LINES)
  const [goals, setGoals] = useLocalStorageState('goals', DEMO_GOALS)
  const [subscriptions, setSubscriptions] = useLocalStorageState(
    'subscriptions',
    DEMO_SUBSCRIPTIONS,
  )
  const [expenses, setExpenses] = useLocalStorageState('expenses', DEMO_EXPENSES)
  const [shoppingItems, setShoppingItems] = useLocalStorageState(
    'shoppingItems',
    DEMO_SHOPPING_ITEMS,
  )

  // Reference content — mock/demo, NOT user data, never persisted.
  const lessons = DEMO_LESSONS
  const comparisonOptions = DEMO_COMPARISON_OPTIONS
  const advisorTips = DEMO_ADVISOR_TIPS
  const activity = DEMO_ACTIVITY
  const deals = DEMO_DEALS
  const renewals = DEMO_RENEWALS

  /* ------------------------------- derived ------------------------------- */
  const totals = useMemo(() => sumBudget(budgetLines), [budgetLines])
  const unallocated = useMemo(
    () => unallocatedIncome(profile.monthlyIncome, budgetLines),
    [profile.monthlyIncome, budgetLines],
  )

  /* ------------------------------- actions ------------------------------- */
  const updateProfile = useCallback(
    (patch) => setProfile((prev) => ({ ...prev, ...patch })),
    [setProfile],
  )

  const setIncome = useCallback(
    (value) => setProfile((prev) => ({ ...prev, monthlyIncome: roundMoney(value) })),
    [setProfile],
  )

  const updateBudgetLine = useCallback(
    (lineId, patch) =>
      setBudgetLines((prev) =>
        prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
      ),
    [setBudgetLines],
  )

  const addBudgetLine = useCallback(
    (category, planned) =>
      setBudgetLines((prev) => [
        ...prev,
        { id: `bud-user-${Date.now()}`, category, planned, spent: 0 },
      ]),
    [setBudgetLines],
  )

  const removeBudgetLine = useCallback(
    (lineId) => setBudgetLines((prev) => prev.filter((line) => line.id !== lineId)),
    [setBudgetLines],
  )

  const updateGoal = useCallback(
    (goalId, patch) =>
      setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, ...patch } : g))),
    [setGoals],
  )

  const addGoal = useCallback(
    (goal) => setGoals((prev) => [...prev, { id: `goal-user-${Date.now()}`, saved: 0, ...goal }]),
    [setGoals],
  )

  const addToGoal = useCallback(
    (goalId, amount) =>
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, saved: roundMoney(g.saved + amount) } : g)),
      ),
    [setGoals],
  )

  const removeGoal = useCallback(
    (goalId) => setGoals((prev) => prev.filter((g) => g.id !== goalId)),
    [setGoals],
  )

  const updateSubscription = useCallback(
    (subId, patch) =>
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, ...patch } : s)),
      ),
    [setSubscriptions],
  )

  const removeSubscription = useCallback(
    (subId) => setSubscriptions((prev) => prev.filter((s) => s.id !== subId)),
    [setSubscriptions],
  )

  const addSubscription = useCallback(
    (sub) => setSubscriptions((prev) => [...prev, { id: `sub-user-${Date.now()}`, ...sub }]),
    [setSubscriptions],
  )

  /* ------------------------------- expenses ------------------------------- */
  const addExpense = useCallback(
    (expense) => setExpenses((prev) => [{ id: `exp-user-${Date.now()}`, ...expense }, ...prev]),
    [setExpenses],
  )

  const updateExpense = useCallback(
    (expenseId, patch) =>
      setExpenses((prev) => prev.map((e) => (e.id === expenseId ? { ...e, ...patch } : e))),
    [setExpenses],
  )

  const removeExpense = useCallback(
    (expenseId) => setExpenses((prev) => prev.filter((e) => e.id !== expenseId)),
    [setExpenses],
  )

  /* ------------------------------- shopping ------------------------------- */
  const addShoppingItem = useCallback(
    (item) => setShoppingItems((prev) => [...prev, { id: `shop-user-${Date.now()}`, ...item }]),
    [setShoppingItems],
  )

  const updateShoppingItem = useCallback(
    (itemId, patch) =>
      setShoppingItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item))),
    [setShoppingItems],
  )

  const removeShoppingItem = useCallback(
    (itemId) => setShoppingItems((prev) => prev.filter((item) => item.id !== itemId)),
    [setShoppingItems],
  )

  /** Reset every persisted value back to the demo seed. */
  const resetToDemoData = useCallback(() => {
    setProfile(DEMO_PROFILE)
    setBudgetLines(DEMO_BUDGET_LINES)
    setGoals(DEMO_GOALS)
    setSubscriptions(DEMO_SUBSCRIPTIONS)
    setExpenses(DEMO_EXPENSES)
    setShoppingItems(DEMO_SHOPPING_ITEMS)
  }, [setProfile, setBudgetLines, setGoals, setSubscriptions, setExpenses, setShoppingItems])

  return {
    // persisted state
    profile,
    budgetLines,
    goals,
    subscriptions,
    expenses,
    shoppingItems,
    // reference content (mock, not persisted)
    lessons,
    comparisonOptions,
    advisorTips,
    activity,
    deals,
    renewals,
    // derived
    totals,
    unallocated,
    // actions
    setIncome,
    updateProfile,
    updateBudgetLine,
    addBudgetLine,
    removeBudgetLine,
    updateGoal,
    addGoal,
    addToGoal,
    removeGoal,
    updateSubscription,
    addSubscription,
    removeSubscription,
    addExpense,
    updateExpense,
    removeExpense,
    addShoppingItem,
    updateShoppingItem,
    removeShoppingItem,
    resetToDemoData,
  }
}
