/**
 * supabaseFinance.js — persistence + normalization boundary for Supabase.
 *
 * Two responsibilities, kept separate from UI and from math:
 *
 * 1. MAPPING (Phase 12): snake_case database rows ↔ camelCase frontend
 *    objects. Views never learn about database column names. Frontend ids are
 *    stored in the DB's uuid columns as real uuids (ids come FROM the db, so
 *    they are stable everywhere).
 *
 * 2. PERSISTENCE (Phase 8/9): thin async wrappers around supabase-js. RLS is
 *    the security boundary; user_id is always derived from the authenticated
 *    session server-side (never accepted from a form). Every wrapper returns
 *    { data, error } with error already unwrapped for clean UI handling.
 */
import { supabase } from './supabase'

/* ================================ mapping ================================ */

export function fromProfile(row) {
  return {
    id: row.id,
    displayName: row.display_name ?? '',
    currency: row.currency ?? 'ZAR',
    monthlyIncome: Number(row.monthly_income ?? 0),
    monthlyBudget: Number(row.monthly_budget ?? 0),
    // Derived at read time so the rest of the app is unchanged: money held is
    // the sum of account balances (Phase 10). No profile-level balance stored.
    availableBalance: null, // filled in by the caller after accounts load
  }
}

export function toProfileUpdate(profile) {
  return {
    display_name: profile.displayName ?? null,
    currency: profile.currency ?? 'ZAR',
    monthly_income: profile.monthlyIncome ?? 0,
    monthly_budget: profile.monthlyBudget ?? 0,
  }
}

export function fromAccount(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balance: Number(row.balance ?? 0),
    note: row.note ?? '',
  }
}

export function toAccountInsert(account, userId) {
  return {
    user_id: userId,
    name: account.name,
    type: account.type,
    balance: account.balance,
    note: account.note || null,
  }
}

export function toAccountUpdate(account) {
  return {
    name: account.name,
    type: account.type,
    balance: account.balance,
    note: account.note || null,
  }
}

export function fromExpense(row) {
  return {
    id: row.id,
    name: row.description,
    amount: Number(row.amount),
    category: row.category,
    date: row.date,
    accountId: row.account_id ?? null,
  }
}

export function toExpenseInsert(expense, userId) {
  return {
    user_id: userId,
    description: expense.name,
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
    account_id: expense.accountId ?? null,
  }
}

export function fromGoal(row) {
  return {
    id: row.id,
    name: row.name,
    target: Number(row.target_amount),
    targetDate: row.target_date ?? '',
    note: row.note ?? '',
    // Derived from contributions (loaded by the caller), not stored.
    saved: row.saved ?? 0,
  }
}

export function toGoalInsert(goal, userId) {
  return {
    user_id: userId,
    name: goal.name,
    target_amount: goal.target,
    target_date: goal.targetDate || null,
    note: goal.note || null,
  }
}

export function toGoalUpdate(goal) {
  return {
    name: goal.name,
    target_amount: goal.target,
    target_date: goal.targetDate || null,
    note: goal.note || null,
  }
}

export function fromContribution(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    date: row.date,
    goalId: row.goal_id ?? null,
    accountId: row.account_id ?? null,
    label: row.note || 'Contribution',
    // Same shape demo contributions use (`goal-<id>` or '' for general
    // savings) so the Savings view can attribute rows to goals in both modes.
    destination: row.goal_id ? `goal-${row.goal_id}` : '',
  }
}

export function toContributionInsert(contribution, userId) {
  return {
    user_id: userId,
    goal_id: contribution.goalId || null,
    account_id: contribution.accountId ?? null,
    amount: contribution.amount,
    date: contribution.date,
    note: contribution.label || null,
  }
}

export function fromSubscription(row) {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_date ?? '',
    category: row.category ?? '',
    status: row.status ?? 'active',
    note: row.note ?? '',
    accountId: row.account_id ?? null,
  }
}

export function toSubscriptionInsert(sub, userId) {
  return {
    user_id: userId,
    name: sub.name,
    amount: sub.amount,
    billing_cycle: sub.billingCycle,
    next_date: sub.nextBillingDate || null,
    category: sub.category || null,
    status: sub.status ?? 'active',
    note: sub.note || null,
    account_id: sub.accountId ?? null,
  }
}

export function toSubscriptionUpdate(sub) {
  return {
    name: sub.name,
    amount: sub.amount,
    billing_cycle: sub.billingCycle,
    next_date: sub.nextBillingDate || null,
    category: sub.category || null,
    status: sub.status ?? 'active',
    note: sub.note || null,
  }
}

export function fromPlannedExpense(row) {
  return {
    id: row.id,
    name: row.title,
    amount: Number(row.amount),
    date: row.date,
    category: row.category ?? 'Other',
    status: row.status ?? 'planned',
    notes: row.note ?? '',
    accountId: row.account_id ?? null,
  }
}

export function toPlannedInsert(planned, userId) {
  return {
    user_id: userId,
    title: planned.name,
    amount: planned.amount,
    date: planned.date,
    category: planned.category || null,
    status: planned.status ?? 'planned',
    note: planned.notes || null,
    account_id: planned.accountId ?? null,
  }
}

export function toPlannedUpdate(planned) {
  return {
    title: planned.name,
    amount: planned.amount,
    date: planned.date,
    category: planned.category || null,
    status: planned.status ?? 'planned',
    note: planned.notes || null,
  }
}

export function fromActivity(row) {
  return {
    id: row.id,
    date: typeof row.created_at === 'string' ? row.created_at.slice(0, 10) : '',
    kind: row.type,
    label: row.message ?? '',
    detail: '',
    tone: 'neutral',
  }
}

export function toActivityInsert(activity, userId, entityId = null) {
  return {
    user_id: userId,
    type: activity.kind,
    message: activity.label,
    entity_type: activity.kind,
    entity_id: entityId,
  }
}

/* ============================== persistence ============================== */

function unwrap({ data, error }) {
  if (error) return { data: null, error }
  return { data, error: null }
}

function message(error, fallback) {
  return error instanceof Error ? error.message : (error?.message ?? fallback)
}

/** Fetch every financial collection for a user in parallel. */
export async function fetchUserData(userId) {
  const [
    profileRes, accountsRes, expensesRes, goalsRes, contributionsRes,
    subscriptionsRes, plannedRes, activityRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('accounts').select('*').order('created_at'),
    supabase.from('expenses').select('*').order('date', { ascending: false }),
    supabase.from('savings_goals').select('*').order('created_at'),
    supabase.from('savings_contributions').select('*').order('date', { ascending: false }),
    supabase.from('subscriptions').select('*').order('created_at'),
    supabase.from('planned_expenses').select('*').order('date'),
    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(30),
  ])

  const firstError =
    profileRes.error || accountsRes.error || expensesRes.error || goalsRes.error ||
    contributionsRes.error || subscriptionsRes.error || plannedRes.error || activityRes.error
  if (firstError) return { data: null, error: message(firstError, 'Failed to load your data.') }

  const profileRow = profileRes.data
  const accounts = (accountsRes.data ?? []).map(fromAccount)

  if (!profileRow) {
    // Trigger should prevent this, but handle it safely without faking a UUID.
    return {
      data: { missingProfile: true, accounts },
      error: null,
    }
  }

  // Goal progress is derived from contributions, in application code.
  const contributions = (contributionsRes.data ?? []).map(fromContribution)
  const savedByGoal = new Map()
  for (const c of contributions) {
    if (c.goalId) savedByGoal.set(c.goalId, (savedByGoal.get(c.goalId) ?? 0) + c.amount)
  }

  const profile = fromProfile(profileRow)
  profile.availableBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  return {
    data: {
      profile,
      accounts,
      expenses: (expensesRes.data ?? []).map(fromExpense),
      goals: (goalsRes.data ?? []).map((row) => fromGoal({ ...row, saved: round2(savedByGoal.get(row.id) ?? 0) })),
      savingsContributions: contributions,
      subscriptions: (subscriptionsRes.data ?? []).map(fromSubscription),
      plannedExpenses: (plannedRes.data ?? []).map(fromPlannedExpense),
      activityLog: (activityRes.data ?? []).map(fromActivity),
      missingProfile: false,
    },
    error: null,
  }
}

/** Create the profiles row if the DB trigger has not already done so. */
export async function ensureProfile(userId, displayName) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: displayName || null }, { onConflict: 'id' })
  return unwrap({ data: null, error: error ? message(error, 'Could not create your profile.') : null })
}

export async function saveProfile(userId, profile) {
  return supabase
    .from('profiles')
    .update(toProfileUpdate(profile))
    .eq('id', userId)
    .then((r) => unwrap({ ...r, error: r.error ? message(r.error, 'Could not save your profile.') : null }))
}

export async function insertAccount(userId, account) {
  const res = await supabase.from('accounts').insert(toAccountInsert(account, userId)).select().single()
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not add the account.') } : { data: fromAccount(res.data), error: null })
}

export async function updateAccountRow(userId, accountId, patch) {
  const res = await supabase.from('accounts').update(toAccountUpdate(patch)).eq('id', accountId).eq('user_id', userId)
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not update the account.') } : { data: null, error: null })
}

export async function deleteAccountRow(userId, accountId) {
  const res = await supabase.from('accounts').delete().eq('id', accountId).eq('user_id', userId)
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not remove the account.') } : { data: null, error: null })
}

export async function insertExpense(userId, expense) {
  const res = await supabase.from('expenses').insert(toExpenseInsert(expense, userId)).select().single()
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not add the expense.') } : { data: fromExpense(res.data), error: null })
}

export async function deleteExpenseRow(userId, expenseId) {
  const res = await supabase.from('expenses').delete().eq('id', expenseId).eq('user_id', userId)
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not remove the expense.') } : { data: null, error: null })
}

export async function insertGoal(userId, goal) {
  const res = await supabase.from('savings_goals').insert(toGoalInsert(goal, userId)).select().single()
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not create the goal.') } : { data: fromGoal({ ...res.data, saved: 0 }), error: null })
}

export async function updateGoalRow(userId, goalId, goal) {
  const res = await supabase.from('savings_goals').update(toGoalUpdate(goal)).eq('id', goalId).eq('user_id', userId)
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not update the goal.') } : { data: null, error: null })
}

export async function deleteGoalRow(userId, goalId) {
  const res = await supabase.from('savings_goals').delete().eq('id', goalId).eq('user_id', userId)
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not remove the goal.') } : { data: null, error: null })
}

export async function insertContribution(userId, contribution) {
  const res = await supabase.from('savings_contributions').insert(toContributionInsert(contribution, userId)).select().single()
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not record the contribution.') } : { data: fromContribution(res.data), error: null })
}

export async function insertSubscription(userId, sub) {
  const res = await supabase.from('subscriptions').insert(toSubscriptionInsert(sub, userId)).select().single()
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not add the subscription.') } : { data: fromSubscription(res.data), error: null })
}

export async function updateSubscriptionRow(userId, subId, sub) {
  const res = await supabase.from('subscriptions').update(toSubscriptionUpdate(sub)).eq('id', subId).eq('user_id', userId)
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not update the subscription.') } : { data: null, error: null })
}

export async function deleteSubscriptionRow(userId, subId) {
  const res = await supabase.from('subscriptions').delete().eq('id', subId).eq('user_id', userId)
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not remove the subscription.') } : { data: null, error: null })
}

export async function insertPlanned(userId, planned) {
  const res = await supabase.from('planned_expenses').insert(toPlannedInsert(planned, userId)).select().single()
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not add the planned expense.') } : { data: fromPlannedExpense(res.data), error: null })
}

export async function updatePlannedRow(userId, plannedId, planned) {
  const res = await supabase.from('planned_expenses').update(toPlannedUpdate(planned)).eq('id', plannedId).eq('user_id', userId)
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not update the planned expense.') } : { data: null, error: null })
}

export async function deletePlannedRow(userId, plannedId) {
  const res = await supabase.from('planned_expenses').delete().eq('id', plannedId).eq('user_id', userId)
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not remove the planned expense.') } : { data: null, error: null })
}

export async function insertActivity(userId, activity, entityId = null) {
  const res = await supabase.from('activity_log').insert(toActivityInsert(activity, userId, entityId))
  return unwrap(res.error ? { data: null, error: message(res.error, 'Could not log the activity.') } : { data: null, error: null })
}

/** Deterministic 2-decimal rounding shared with lib/finance semantics. */
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
