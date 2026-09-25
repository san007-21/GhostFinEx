import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { useLocalStorageState } from './useLocalStorageState'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { reconcileV3DemoState } from '../data/mockData'
import {
  DEMO_ACCOUNTS,
  DEMO_ADVISOR_TIPS,
  DEMO_DEALS,
  DEMO_EXPENSES,
  DEMO_GHOST_CONVERSATION,
  DEMO_GOALS,
  DEMO_LESSONS,
  DEMO_PLANNED_EXPENSES,
  DEMO_PRODUCTS,
  DEMO_PROFILE,
  DEMO_SAVINGS_CONTRIBUTIONS,
  DEMO_SUBSCRIPTIONS,
  EXPENSE_CATEGORIES,
} from '../data/mockData'
import { deriveOverview, goalSavedAmount, goalsWithProgress, monthlyNet, roundMoney, savingsOverview, upcomingRenewals } from '../lib/finance'
import * as remote from '../lib/supabaseFinance'

// v3: demo seed rebalanced so account sums equal the derived available
// balance (Phase 10 unification). Bumping the key re-seeds demo data cleanly.
const STORAGE_VERSION = 'v4'

/**
 * Account balances are the single source of truth for money currently held
 * (Phase 10). `profile.availableBalance` is a derived convenience for the
 * existing calculation layer — it is recomputed from accounts everywhere and
 * is never an independently editable or persisted balance.
 */
function sumAccountBalances(accounts) {
  return roundMoney(accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0))
}

/**
 * P1-B storage migration: v3 demo state carried an independent goal.saved
 * that the contribution ledger could not reconstruct. Bumping the storage
 * version alone would silently WIPE returning users' demo edits, so instead
 * v3 payloads are translated once into v4: each goal's excess saved amount
 * becomes a dated 'Carried over' contribution, making the ledger coherent.
 */
function loadV4State(key, seed) {
  const storageKey = `ghostfinex.${key}`
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (raw !== null) return JSON.parse(raw) // already v4
  } catch {
    return seed
  }
  // No v4 value: look for the v3 payload and migrate it (once).
  try {
    const legacy = window.localStorage.getItem(`ghostfinex.v3.${key.split('.').slice(1).join('.')}`)
    if (legacy !== null) {
      const migrated = key.endsWith('.savingsContributions')
        ? (reconcileV3DemoState({ goals: readV3('goals'), savingsContributions: JSON.parse(legacy) })?.savingsContributions ?? JSON.parse(legacy))
        : JSON.parse(legacy)
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(migrated))
      } catch { /* private mode: migrate in memory only */ }
      return migrated
    }
  } catch { /* fall through to seed */ }
  return seed
}

function readV3(key) {
  try {
    const raw = window.localStorage.getItem(`ghostfinex.v3.${key}`)
    return raw === null ? [] : JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * Central state for GhostFinEx.
 *
 * Two isolated modes behind one identical public API (Phase 7/8):
 *
 * - LOCAL (demo): when there is no authenticated Supabase session. Data lives
 *   in localStorage seeded with DEMO_* mock data — the original prototype
 *   behavior, byte-for-byte. Demo data never touches Supabase.
 *
 * - REMOTE (authenticated): when Supabase is configured and a real session
 *   exists. Source of truth is PostgreSQL; this hook mirrors it into React
 *   state with optimistic updates and reconciles on every refetch. A fresh
 *   account starts EMPTY (Phase 16) — demo data is never copied into it.
 *
 * Deterministic math stays in lib/finance.js and runs identically in both
 * modes; this hook only owns storage and orchestration.
 */
export function useFinanceState() {
  const auth = useAuth()
  const remoteUser = auth.user && !auth.user.isDemo ? auth.user : null
  const isRemote = Boolean(isSupabaseConfigured && supabase && remoteUser)

  /* ============================ LOCAL (demo) ============================ */
  const [profile, setProfile] = useLocalStorageState(`${STORAGE_VERSION}.profile`, DEMO_PROFILE)
  const [expenses, setExpenses] = useLocalStorageState(`${STORAGE_VERSION}.expenses`, DEMO_EXPENSES)
  // P1-B: goals/contributions migrate from v3 rather than re-seeding, so a
  // returning demo user keeps their story with a now-coherent ledger.
  const [goals, setGoals] = useLocalStorageState(`${STORAGE_VERSION}.goals`, loadV4State('v4.goals', DEMO_GOALS))
  const [subscriptions, setSubscriptions] = useLocalStorageState(`${STORAGE_VERSION}.subscriptions`, DEMO_SUBSCRIPTIONS)
  const [plannedExpenses, setPlannedExpenses] = useLocalStorageState(`${STORAGE_VERSION}.plannedExpenses`, DEMO_PLANNED_EXPENSES)
  const [accounts, setAccounts] = useLocalStorageState(`${STORAGE_VERSION}.accounts`, DEMO_ACCOUNTS)
  const [savingsContributions, setSavingsContributions] = useLocalStorageState(
    `${STORAGE_VERSION}.savingsContributions`,
    loadV4State('v4.savingsContributions', DEMO_SAVINGS_CONTRIBUTIONS),
  )
  const [activityLog, setActivityLog] = useLocalStorageState(`${STORAGE_VERSION}.activity`, [])

  /* ============================ REMOTE state ============================ */
  const [remoteData, setRemoteData] = useState(null)
  const [status, setStatus] = useState({ loading: false, saving: false, deleting: false, error: '' })

  const setRemoteStatus = useCallback((patch) => setStatus((prev) => ({ ...prev, ...patch })), [])

  /** Recompute the derived profile balance from account sums (Phase 10).
   *  Expenses and contributions NEVER mutate balances — accounts are manually
   *  maintained by the user; no silent balance triggers anywhere. */
  const applyBalances = useCallback((state) => {
    const sum = state.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)
    return { ...state, profile: { ...state.profile, availableBalance: roundMoney(sum) } }
  }, [])

  const emptyRemoteState = useCallback(() => ({
    profile: {
      id: remoteUser?.id ?? null,
      displayName: remoteUser?.displayName ?? '',
      currency: 'ZAR',
      monthlyIncome: 0,
      monthlyBudget: 0,
      availableBalance: 0,
    },
    accounts: [],
    expenses: [],
    goals: [],
    savingsContributions: [],
    subscriptions: [],
    plannedExpenses: [],
    activityLog: [],
  }), [remoteUser])

  const updateRemote = useCallback((updater) => {
    setRemoteData((prev) => applyBalances(updater(prev ?? emptyRemoteState())))
  }, [applyBalances, emptyRemoteState])

  const loadRemote = useCallback(async () => {
    if (!supabase || !remoteUser) return
    // Async from the first statement, so callers' effects stay synchronous.
    await Promise.resolve()
    try {
      setRemoteStatus({ loading: true, error: '' })
      let result = await remote.fetchUserData(remoteUser.id)
      if (!result.error && result.data?.missingProfile) {
        // DB trigger absent or delayed — create the profile safely, then refetch.
        const ensured = await remote.ensureProfile(remoteUser.id, remoteUser.displayName)
        if (ensured.error) {
          setRemoteStatus({ loading: false, error: ensured.error })
          return
        }
        result = await remote.fetchUserData(remoteUser.id)
      }
      if (result.error) {
        setRemoteStatus({ loading: false, error: result.error })
        return
      }
      const data = result.data.missingProfile ? emptyRemoteState() : result.data
      setRemoteData(applyBalances(data))
      setRemoteStatus({ loading: false, error: '' })
    } catch (err) {
      setRemoteStatus({ loading: false, error: err?.message ?? 'Could not reach the database.' })
    }
  }, [remoteUser, setRemoteStatus, applyBalances, emptyRemoteState])

  // Load (and reload on user change). `active` guards against post-unmount
  // updates (Phase 13); the identity-keyed effect avoids duplicate fetches.
  useEffect(() => {
    if (!isRemote) {
      // Deferred so signing out doesn't cascade synchronously (React lint);
      // the display selectors already ignore remote data in local mode.
      const clear = setTimeout(() => {
        setRemoteData(null)
        setRemoteStatus({ loading: false, saving: false, deleting: false, error: '' })
      }, 0)
      return () => clearTimeout(clear)
    }
    // External-system sync (Supabase → React state): the canonical use of an
    // effect. SetStates happen after awaits, never synchronously in the body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRemote()
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRemote, remoteUser?.id])

  /**
   * Optimistic mutation wrapper: applies a local mirror immediately, performs
   * the async write, and reconciles/refetches on failure. Keeps the UI live
   * without per-view loading spinners for every action. When a mutation fails
   * WITHOUT an optimistic patch (e.g. the server rejected the insert), the
   * next loadRemote() refresh discards any phantom optimistic row that was
   * already rendered.
   */
  const mutateRemote = useCallback(async (kind, work, optimistic) => {
    if (!supabase || !remoteUser) return null
    const prevSnapshot = remoteData
    if (optimistic) updateRemote(optimistic)
    setRemoteStatus({ [kind]: true, error: '' })
    try {
      const { data, error } = await work()
      if (error) {
        if (optimistic) setRemoteData(prevSnapshot) // roll back
        else loadRemote() // server rejected a plain insert: purge phantom rows
        setRemoteStatus({ [kind]: false, error })
        return null
      }
      setRemoteStatus({ [kind]: false, error: '' })
      return data ?? true
    } catch (err) {
      if (optimistic) setRemoteData(prevSnapshot)
      else loadRemote() // transport-level failure: purge phantom rows
      setRemoteStatus({ [kind]: false, error: err?.message ?? 'Unexpected error.' })
      return null
    }
  }, [remoteUser, remoteData, updateRemote, setRemoteStatus, loadRemote])

  /** Fire-and-forget activity logging; the feed is non-critical by design. */
  const logRemoteActivity = useCallback((kind, label, entityId = null) => {
    if (!supabase || !remoteUser) return
    remote.insertActivity(remoteUser.id, { kind, label }, entityId).catch(() => {})
  }, [remoteUser])

  /* ====================== reference content (mock) ====================== */
  const lessons = DEMO_LESSONS
  const products = DEMO_PRODUCTS
  const deals = DEMO_DEALS
  const advisorTips = DEMO_ADVISOR_TIPS
  const ghostDemoConversation = DEMO_GHOST_CONVERSATION
  const categories = EXPENSE_CATEGORIES

  /* ============================ ACTIVE state ============================ */
  // Raw profile per mode; the final activeProfile is assembled below because
  // its balance is derived from the account selectors.
  const activeProfileBase = isRemote ? remoteData?.profile ?? emptyRemoteState().profile : profile
  const activeExpenses = useMemo(
    () => (isRemote ? remoteData?.expenses ?? [] : expenses),
    [isRemote, remoteData, expenses],
  )
  const activeSubscriptions = useMemo(
    () => (isRemote ? remoteData?.subscriptions ?? [] : subscriptions),
    [isRemote, remoteData, subscriptions],
  )
  const activePlanned = useMemo(
    () => (isRemote ? remoteData?.plannedExpenses ?? [] : plannedExpenses),
    [isRemote, remoteData, plannedExpenses],
  )
  const activeAccounts = useMemo(
    () => (isRemote ? remoteData?.accounts ?? [] : accounts),
    [isRemote, remoteData, accounts],
  )
  const activeContributions = useMemo(
    () => (isRemote ? remoteData?.savingsContributions ?? [] : savingsContributions),
    [isRemote, remoteData, savingsContributions],
  )
  const activeActivity = useMemo(
    () => (isRemote ? remoteData?.activityLog ?? [] : activityLog),
    [isRemote, remoteData, activityLog],
  )
  // Money held is derived from account sums in BOTH modes (Phase 10) — there
  // is no independent profile-level balance truth anywhere in the app.
  const activeProfile = useMemo(
    () => ({
      ...activeProfileBase,
      availableBalance: sumAccountBalances(activeAccounts),
    }),
    [activeProfileBase, activeAccounts],
  )
  // P1-B: goal progress is ALWAYS the sum of contributions — the same rule in
  // demo and authenticated mode. A goal row carries no authoritative `saved`.
  const activeGoals = useMemo(
    () => goalsWithProgress(isRemote ? remoteData?.goals ?? [] : goals, activeContributions),
    [isRemote, remoteData, goals, activeContributions],
  )
  const overview = useMemo(
    () => deriveOverview({ profile: activeProfile, expenses: activeExpenses }),
    [activeProfile, activeExpenses],
  )
  const net = useMemo(
    () => monthlyNet(activeProfile.monthlyIncome, activeProfile.monthlyBudget),
    [activeProfile],
  )
  const renewals = useMemo(() => upcomingRenewals(activeSubscriptions, 6), [activeSubscriptions])
  const savings = useMemo(
    () => savingsOverview({ contributions: activeContributions, goals: activeGoals, net, leftoverCash: overview.savingsThisMonth }),
    [activeContributions, activeGoals, net, overview.savingsThisMonth],
  )

  /* ======================= LOCAL actions (unchanged) ===================== */
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

  const updateProfileLocal = useCallback(
    (patch) => setProfile((prev) => ({ ...prev, ...patch })),
    [setProfile],
  )
  const setIncome = useCallback(
    (value) => {
      const safe = roundMoney(Math.max(0, value))
      if (isRemote) {
        updateRemote((s) => ({ ...s, profile: { ...s.profile, monthlyIncome: safe } }))
        remote.saveProfile(remoteUser.id, { ...activeProfile, monthlyIncome: safe }).then(({ error }) => {
          if (error) setRemoteStatus({ error })
        })
        return
      }
      setProfile((prev) => ({ ...prev, monthlyIncome: safe }))
    },
    [isRemote, remoteUser, activeProfile, updateRemote, setRemoteStatus, setProfile],
  )
  const setBudget = useCallback(
    (value) => {
      const safe = roundMoney(Math.max(0, value))
      if (isRemote) {
        updateRemote((s) => ({ ...s, profile: { ...s.profile, monthlyBudget: safe } }))
        remote.saveProfile(remoteUser.id, { ...activeProfile, monthlyBudget: safe }).then(({ error }) => {
          if (error) setRemoteStatus({ error })
        })
        return
      }
      setProfile((prev) => ({ ...prev, monthlyBudget: safe }))
    },
    [isRemote, remoteUser, activeProfile, updateRemote, setRemoteStatus, setProfile],
  )
  // Phase 10: money held lives in accounts in BOTH modes — there is no
  // editable profile-level balance. Overview shows the derived total and
  // points at the Accounts view; nothing else may write a profile balance.
  const setBalance = useCallback(
    () => {
      /* Intentionally inert: availableBalance is derived from accounts. */
    },
    [],
  )

  const addExpense = useCallback(
    (expense) => {
      if (isRemote) {
        const optimistic = (s) => ({ ...s, expenses: [{ ...expense, id: `temp-${Date.now()}` }, ...s.expenses] })
        updateRemote(optimistic)
        mutateRemote('saving', () => remote.insertExpense(remoteUser.id, expense), optimistic).then((data) => {
          if (data && data.id) updateRemote((s) => ({ ...s, expenses: s.expenses.map((e) => (e.id.startsWith('temp-') && e.name === expense.name ? data : e)) }))
          if (data) logRemoteActivity('expense', `Expense added — ${expense.name}`, data.id)
        })
        return
      }
      setExpenses((prev) => [{ id: `exp-user-${Date.now()}`, ...expense }, ...prev])
      logActivity('expense', `Expense added — ${expense.name}`, formatDetail(expense.amount), 'neutral')
    },
    [isRemote, remoteUser, updateRemote, mutateRemote, logRemoteActivity, setExpenses, logActivity],
  )
  const removeExpense = useCallback(
    (expenseId) => {
      if (isRemote) {
        const prevSnapshot = remoteData
        updateRemote((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== expenseId) }))
        mutateRemote('deleting', () => remote.deleteExpenseRow(remoteUser.id, expenseId), null).then((ok) => {
          if (!ok) setRemoteData(prevSnapshot)
        })
        return
      }
      setExpenses((prev) => {
        const target = prev.find((e) => e.id === expenseId)
        if (target) logActivity('expense', `Expense removed — ${target.name}`, `−${formatDetail(target.amount)}`, 'neutral')
        return prev.filter((e) => e.id !== expenseId)
      })
    },
    [isRemote, remoteUser, remoteData, updateRemote, mutateRemote, setExpenses, logActivity],
  )

  const addGoal = useCallback(
    (goal) => {
      // P1-B: an initial "already saved" amount becomes a dated contribution —
      // goal progress is never stored independently of the ledger.
      const { saved: initialSaved, ...goalFields } = goal
      const safeInitial = roundMoney(Math.max(0, Number(initialSaved) || 0))
      if (isRemote) {
        const optimistic = (s) => ({ ...s, goals: [...s.goals, { ...goalFields, id: `temp-${Date.now()}` }] })
        updateRemote(optimistic)
        mutateRemote('saving', () => remote.insertGoal(remoteUser.id, goalFields), optimistic).then((data) => {
          if (data && data.id) {
            updateRemote((s) => ({ ...s, goals: s.goals.map((g) => (g.id.startsWith('temp-') && g.name === goalFields.name ? data : g)) }))
            if (safeInitial > 0) {
              const today = new Date().toISOString().slice(0, 10)
              mutateRemote('saving', () => remote.insertContribution(remoteUser.id, { amount: safeInitial, date: today, goalId: data.id, label: 'Starting amount' }), null)
            }
            logRemoteActivity('goal', `Goal created — ${goalFields.name}`, data.id)
          }
        })
        return
      }
      const goalId = `goal-user-${Date.now()}`
      setGoals((prev) => [...prev, { id: goalId, ...goalFields }])
      if (safeInitial > 0) {
        setSavingsContributions((prev) => [
          { id: `sav-user-${Date.now()}`, amount: safeInitial, date: new Date().toISOString().slice(0, 10), destination: `goal-${goalId}`, label: 'Starting amount' },
          ...prev,
        ])
      }
      logActivity('goal', `Goal created — ${goalFields.name}`, `target ${formatDetail(goalFields.target)}`, 'accent')
    },
    [isRemote, remoteUser, updateRemote, mutateRemote, logRemoteActivity, setGoals, setSavingsContributions, logActivity],
  )
  const updateGoal = useCallback(
    (goalId, patch) => {
      if (isRemote) {
        const current = remoteData?.goals.find((g) => g.id === goalId)
        if (!current) return
        const next = { ...current, ...patch }
        updateRemote((s) => ({ ...s, goals: s.goals.map((g) => (g.id === goalId ? next : g)) }))
        // "Saved so far" edits become explicit contributions dated today so
        // goal progress stays derived from the contributions ledger.
        if (patch.saved !== undefined) {
          const currentSaved = goalSavedAmount(goalId, remoteData?.savingsContributions ?? [])
          const delta = roundMoney((Number(patch.saved) || 0) - currentSaved)
          if (delta > 0) {
            const today = new Date().toISOString().slice(0, 10)
            mutateRemote('saving', () => remote.insertContribution(remoteUser.id, { amount: delta, date: today, goalId, label: 'Adjustment' }), null).then(() => {
              logRemoteActivity('savings', `Adjustment to ${current.name}`)
            })
          } else if (delta < 0) {
            setRemoteStatus({ error: 'Goal progress comes from contributions — remove a contribution to lower it.' })
          }
        }
        const persistable = { name: next.name, target: next.target, targetDate: next.targetDate, note: next.note }
        remote.updateGoalRow(remoteUser.id, goalId, persistable).then(({ error }) => {
          if (error) setRemoteStatus({ error })
        })
        return
      }
      // P1-B: `saved` is derived from contributions — a positive edit becomes
      // an adjustment contribution; a decrease is ignored (remove a
      // contribution from the Savings view instead).
      const { saved: savedPatch, ...rest } = patch
      setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, ...rest } : g)))
      if (savedPatch !== undefined) {
        const currentSaved = goalSavedAmount(goalId, savingsContributions)
        const delta = roundMoney((Number(savedPatch) || 0) - currentSaved)
        if (delta > 0) {
          const today = new Date().toISOString().slice(0, 10)
          setSavingsContributions((prev) => [
            { id: `sav-user-${Date.now()}`, amount: delta, date: today, destination: `goal-${goalId}`, label: 'Adjustment' },
            ...prev,
          ])
        }
      }
    },
    [isRemote, remoteUser, remoteData, updateRemote, mutateRemote, logRemoteActivity, setGoals, setSavingsContributions, setRemoteStatus, savingsContributions],
  )
  const addToGoal = useCallback(
    (goalId, amount) => {
      const safe = roundMoney(Math.max(0, amount))
      if (safe <= 0) return
      // P1-B: a deposit IS a contribution — progress follows the ledger.
      const today = new Date().toISOString().slice(0, 10)
      if (isRemote) {
        const goal = remoteData?.goals.find((g) => g.id === goalId)
        updateRemote((s) => ({
          ...s,
          savingsContributions: [{ id: `temp-${Date.now()}`, amount: safe, date: today, goalId, accountId: null, label: 'Deposit' }, ...s.savingsContributions],
        }))
        mutateRemote('saving', () => remote.insertContribution(remoteUser.id, { amount: safe, date: today, goalId, label: 'Deposit' }), null).then((data) => {
          if (data) logRemoteActivity('savings', `Deposit to ${goal?.name ?? 'goal'}`, data.id)
        })
        return
      }
      const target = goals.find((g) => g.id === goalId)
      if (target) logActivity('goal', `Deposit to ${target.name}`, `+${formatDetail(safe)}`, 'accent')
      setSavingsContributions((prev) => [
        { id: `sav-user-${Date.now()}`, amount: safe, date: today, destination: `goal-${goalId}`, label: 'Deposit' },
        ...prev,
      ])
    },
    [isRemote, remoteUser, remoteData, updateRemote, mutateRemote, logRemoteActivity, goals, setSavingsContributions, logActivity],
  )
  const removeGoal = useCallback(
    (goalId) => {
      if (isRemote) {
        const prevSnapshot = remoteData
        updateRemote((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== goalId) }))
        mutateRemote('deleting', () => remote.deleteGoalRow(remoteUser.id, goalId), null).then((ok) => {
          if (!ok) setRemoteData(prevSnapshot)
        })
        return
      }
      setGoals((prev) => {
        const target = prev.find((g) => g.id === goalId)
        if (target) logActivity('goal', `Goal removed — ${target.name}`, '—', 'neutral')
        return prev.filter((g) => g.id !== goalId)
      })
    },
    [isRemote, remoteUser, remoteData, updateRemote, mutateRemote, setGoals, logActivity],
  )

  const addSubscription = useCallback(
    (sub) => {
      if (isRemote) {
        const optimistic = (s) => ({ ...s, subscriptions: [...s.subscriptions, { ...sub, id: `temp-${Date.now()}` }] })
        updateRemote(optimistic)
        mutateRemote('saving', () => remote.insertSubscription(remoteUser.id, sub), optimistic).then((data) => {
          if (data && data.id) updateRemote((s) => ({ ...s, subscriptions: s.subscriptions.map((x) => (x.id.startsWith('temp-') && x.name === sub.name ? data : x)) }))
          if (data) logRemoteActivity('subscription', `Subscription added — ${sub.name}`, data.id)
        })
        return
      }
      setSubscriptions((prev) => [...prev, { id: `sub-user-${Date.now()}`, ...sub }])
      logActivity('subscription', `Subscription added — ${sub.name}`, `${formatDetail(sub.amount)} / ${sub.billingCycle}`, 'info')
    },
    [isRemote, remoteUser, updateRemote, mutateRemote, logRemoteActivity, setSubscriptions, logActivity],
  )
  const updateSubscription = useCallback(
    (subId, patch) => {
      if (isRemote) {
        const current = remoteData?.subscriptions.find((x) => x.id === subId)
        if (!current) return
        const next = { ...current, ...patch }
        updateRemote((s) => ({ ...s, subscriptions: s.subscriptions.map((x) => (x.id === subId ? next : x)) }))
        remote.updateSubscriptionRow(remoteUser.id, subId, next).then(({ error }) => {
          if (error) setRemoteStatus({ error })
        })
        return
      }
      setSubscriptions((prev) => prev.map((s) => (s.id === subId ? { ...s, ...patch } : s)))
    },
    [isRemote, remoteUser, remoteData, updateRemote, setSubscriptions, setRemoteStatus],
  )
  const removeSubscription = useCallback(
    (subId) => {
      if (isRemote) {
        const prevSnapshot = remoteData
        updateRemote((s) => ({ ...s, subscriptions: s.subscriptions.filter((x) => x.id !== subId) }))
        mutateRemote('deleting', () => remote.deleteSubscriptionRow(remoteUser.id, subId), null).then((ok) => {
          if (!ok) setRemoteData(prevSnapshot)
        })
        return
      }
      setSubscriptions((prev) => {
        const target = prev.find((s) => s.id === subId)
        if (target) logActivity('subscription', `Subscription removed — ${target.name}`, '—', 'neutral')
        return prev.filter((s) => s.id !== subId)
      })
    },
    [isRemote, remoteUser, remoteData, updateRemote, mutateRemote, setSubscriptions, logActivity],
  )

  const addAccount = useCallback(
    (account) => {
      if (isRemote) {
        const optimistic = (s) => ({ ...s, accounts: [...s.accounts, { ...account, id: `temp-${Date.now()}` }] })
        updateRemote(optimistic)
        mutateRemote('saving', () => remote.insertAccount(remoteUser.id, account), optimistic).then((data) => {
          if (data && data.id) updateRemote((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id.startsWith('temp-') && a.name === account.name ? data : a)) }))
          if (data) logRemoteActivity('account', `Account added — ${account.name}`, data.id)
        })
        return
      }
      setAccounts((prev) => [...prev, { id: `acc-user-${Date.now()}`, ...account }])
      logActivity('account', `Account added — ${account.name}`, formatDetail(account.balance), 'info')
    },
    [isRemote, remoteUser, updateRemote, mutateRemote, logRemoteActivity, setAccounts, logActivity],
  )
  const updateAccount = useCallback(
    (accountId, patch) => {
      if (isRemote) {
        const current = remoteData?.accounts.find((a) => a.id === accountId)
        if (!current) return
        const next = { ...current, ...patch }
        updateRemote((s) => {
          const accounts = s.accounts.map((a) => (a.id === accountId ? next : a))
          return { ...s, accounts }
        })
        remote.updateAccountRow(remoteUser.id, accountId, next).then(({ error }) => {
          if (error) setRemoteStatus({ error })
        })
        return
      }
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, ...patch } : a)))
    },
    [isRemote, remoteUser, remoteData, updateRemote, setAccounts, setRemoteStatus],
  )
  const removeAccount = useCallback(
    (accountId) => {
      if (isRemote) {
        const prevSnapshot = remoteData
        updateRemote((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== accountId) }))
        mutateRemote('deleting', () => remote.deleteAccountRow(remoteUser.id, accountId), null).then((ok) => {
          if (!ok) setRemoteData(prevSnapshot)
        })
        return
      }
      setAccounts((prev) => {
        const target = prev.find((a) => a.id === accountId)
        if (target) logActivity('account', `Account removed — ${target.name}`, '—', 'neutral')
        return prev.filter((a) => a.id !== accountId)
      })
    },
    [isRemote, remoteUser, remoteData, updateRemote, mutateRemote, setAccounts, logActivity],
  )

  const recordSavings = useCallback(
    ({ amount, date, destination, label }) => {
      const safeAmount = roundMoney(Math.max(0, amount))
      const goalId = destination?.startsWith('goal-') ? destination.slice('goal-'.length) : null
      if (isRemote) {
        updateRemote((s) => ({
          ...s,
          savingsContributions: [{ id: `temp-${Date.now()}`, amount: safeAmount, date, goalId, accountId: null, label: label?.trim() || 'Contribution' }, ...s.savingsContributions],
        }))
        mutateRemote('saving', () => remote.insertContribution(remoteUser.id, { amount: safeAmount, date, goalId, label }), null).then((data) => {
          if (data) logRemoteActivity('savings', `Savings contribution — ${label?.trim() || 'Contribution'}`, data.id)
        })
        return
      }
      const entry = { id: `sav-user-${Date.now()}`, amount: safeAmount, date, destination: destination ?? '', label: label?.trim() || 'Contribution' }
      setSavingsContributions((prev) => [entry, ...prev])
      logActivity('savings', `Savings contribution — ${entry.label}`, `+${formatDetail(safeAmount)}`, 'accent')
    },
    [isRemote, remoteUser, updateRemote, mutateRemote, logRemoteActivity, setSavingsContributions, logActivity],
  )

  const addPlannedExpense = useCallback(
    (planned) => {
      if (isRemote) {
        const optimistic = (s) => ({ ...s, plannedExpenses: [...s.plannedExpenses, { ...planned, id: `temp-${Date.now()}` }] })
        updateRemote(optimistic)
        mutateRemote('saving', () => remote.insertPlanned(remoteUser.id, planned), optimistic).then((data) => {
          if (data && data.id) updateRemote((s) => ({ ...s, plannedExpenses: s.plannedExpenses.map((p) => (p.id.startsWith('temp-') && p.name === planned.name ? data : p)) }))
          if (data) logRemoteActivity('planned', `Planned expense — ${planned.name}`, data.id)
        })
        return
      }
      setPlannedExpenses((prev) => [...prev, { id: `plan-user-${Date.now()}`, ...planned }])
      logActivity('planned', `Planned expense — ${planned.name}`, formatDetail(planned.amount), 'info')
    },
    [isRemote, remoteUser, updateRemote, mutateRemote, logRemoteActivity, setPlannedExpenses, logActivity],
  )
  const updatePlannedExpense = useCallback(
    (plannedId, patch) => {
      if (isRemote) {
        const current = remoteData?.plannedExpenses.find((p) => p.id === plannedId)
        if (!current) return
        const next = { ...current, ...patch }
        updateRemote((s) => ({ ...s, plannedExpenses: s.plannedExpenses.map((p) => (p.id === plannedId ? next : p)) }))
        remote.updatePlannedRow(remoteUser.id, plannedId, next).then(({ error }) => {
          if (error) setRemoteStatus({ error })
        })
        return
      }
      setPlannedExpenses((prev) => prev.map((p) => (p.id === plannedId ? { ...p, ...patch } : p)))
    },
    [isRemote, remoteUser, remoteData, updateRemote, setPlannedExpenses, setRemoteStatus],
  )
  const removePlannedExpense = useCallback(
    (plannedId) => {
      if (isRemote) {
        const prevSnapshot = remoteData
        updateRemote((s) => ({ ...s, plannedExpenses: s.plannedExpenses.filter((p) => p.id !== plannedId) }))
        mutateRemote('deleting', () => remote.deletePlannedRow(remoteUser.id, plannedId), null).then((ok) => {
          if (!ok) setRemoteData(prevSnapshot)
        })
        return
      }
      setPlannedExpenses((prev) => {
        const target = prev.find((p) => p.id === plannedId)
        if (target) logActivity('planned', `Planned expense removed — ${target.name}`, '—', 'neutral')
        return prev.filter((p) => p.id !== plannedId)
      })
    },
    [isRemote, remoteUser, remoteData, updateRemote, mutateRemote, setPlannedExpenses, logActivity],
  )
  const payPlannedExpense = useCallback(
    (plannedId) => {
      if (isRemote) {
        const target = remoteData?.plannedExpenses.find((p) => p.id === plannedId)
        if (!target) return
        const today = new Date().toISOString().slice(0, 10)
        const prevSnapshot = remoteData
        updateRemote((s) => ({
          ...s,
          expenses: [{ id: `temp-${Date.now()}`, name: target.name, amount: target.amount, category: target.category, date: today, accountId: target.accountId ?? null }, ...s.expenses],
          plannedExpenses: s.plannedExpenses.filter((p) => p.id !== plannedId),
        }))
        ;(async () => {
          const inserted = await remote.insertExpense(remoteUser.id, { name: target.name, amount: target.amount, category: target.category, date: today, accountId: target.accountId ?? null })
          if (inserted.error) {
            setRemoteData(prevSnapshot)
            setRemoteStatus({ saving: false, error: inserted.error })
            return
          }
          const removed = await remote.deletePlannedRow(remoteUser.id, plannedId)
          if (removed.error) {
            setRemoteData(prevSnapshot)
            setRemoteStatus({ saving: false, error: removed.error })
            return
          }
          logRemoteActivity('planned', `Paid planned expense — ${target.name}`)
          setRemoteStatus({ saving: false, error: '' })
        })()
        return
      }
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
    [isRemote, remoteUser, remoteData, updateRemote, logRemoteActivity, setRemoteStatus, setPlannedExpenses, setExpenses, logActivity],
  )

  /** Demo reset is local-only by definition; it never touches remote data. */
  const resetToDemoData = useCallback(() => {
    if (isRemote) return
    setProfile(DEMO_PROFILE)
    setExpenses(DEMO_EXPENSES)
    setGoals(DEMO_GOALS)
    setSubscriptions(DEMO_SUBSCRIPTIONS)
    setPlannedExpenses(DEMO_PLANNED_EXPENSES)
    setAccounts(DEMO_ACCOUNTS)
    setSavingsContributions(DEMO_SAVINGS_CONTRIBUTIONS)
    setActivityLog([])
  }, [isRemote, setProfile, setExpenses, setGoals, setSubscriptions, setPlannedExpenses, setAccounts, setSavingsContributions, setActivityLog])

  const dismissError = useCallback(() => setRemoteStatus({ error: '' }), [setRemoteStatus])

  return {
    // persisted state
    profile: activeProfile,
    expenses: activeExpenses,
    goals: activeGoals,
    subscriptions: activeSubscriptions,
    plannedExpenses: activePlanned,
    accounts: activeAccounts,
    savingsContributions: activeContributions,
    activityLog: activeActivity,
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
    savings,
    // mode + async status (Phase 13)
    isRemote,
    status,
    dismissError,
    refresh: loadRemote,
    // actions
    updateProfile: isRemote
      ? (patch) => {
          updateRemote((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
          remote.saveProfile(remoteUser.id, { ...activeProfile, ...patch }).then(({ error }) => {
            if (error) setRemoteStatus({ error })
          })
        }
      : updateProfileLocal,
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
    addAccount,
    updateAccount,
    removeAccount,
    recordSavings,
    resetToDemoData,
  }
}

function formatDetail(value) {
  return `R ${roundMoney(value).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
