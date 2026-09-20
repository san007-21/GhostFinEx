import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Modal, { ConfirmDialog } from '../components/ui/Modal.jsx'
import { Badge, Button, Disclaimer, EmptyState, NumberField, SelectField, StatCard, TextField } from '../components/ui/Primitives.jsx'
import { formatCurrency } from '../lib/format'
import { costPerUse, monthlySubscriptionCost, normalizeToMonthly, roundMoney, yearlySubscriptionCost } from '../lib/finance'
import { shortDayLabel } from '../lib/calendar'
import { IconRepeat } from '../components/ui/icons.jsx'

const EMPTY_SUB = { name: '', amount: 0, billingCycle: 'monthly', usesPerMonth: 4, notes: '' }

export default function SubscriptionsView({ finance }) {
  const { subscriptions, goals, renewals, updateSubscription, removeSubscription, addSubscription, addToGoal } = finance

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_SUB)
  const [cancelled, setCancelled] = useState({})
  const [redirectAmount, setRedirectAmount] = useState(0)
  const [redirectGoalId, setRedirectGoalId] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)

  const monthlyTotal = monthlySubscriptionCost(subscriptions)
  const yearlyTotal = yearlySubscriptionCost(subscriptions)
  const simMonthlyFreed = roundMoney(
    subscriptions
      .filter((sub) => cancelled[sub.id])
      .reduce((total, sub) => total + normalizeToMonthly(sub.amount, sub.billingCycle), 0),
  )
  const lowUsageCount = subscriptions.filter((sub) => sub.usesPerMonth <= 2).length

  const submitAdd = (event) => {
    event.preventDefault()
    if (!form.name.trim() || form.amount <= 0) return
    addSubscription({ ...form, name: form.name.trim(), lastUsed: null })
    setForm(EMPTY_SUB)
    setAddOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring costs, normalized to monthly — so yearly and monthly plans compare fairly."
      >
        <Button onClick={() => setAddOpen(true)}>+ Add subscription</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Per month" value={formatCurrency(monthlyTotal, { compact: true })} sub="Across all subscriptions" />
        <StatCard label="Per year" value={formatCurrency(yearlyTotal, { compact: true })} sub="What the leaks add up to" tone="info" />
        <StatCard label="If cancelled (simulated)" value={formatCurrency(simMonthlyFreed, { compact: true })} sub={`${formatCurrency(roundMoney(simMonthlyFreed * 12), { compact: true })} freed per year`} tone="accent" />
        <StatCard label="Active" value={String(subscriptions.length)} sub={`${lowUsageCount} low-usage`} />
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={IconRepeat}
          title="No subscriptions tracked"
          description="Add your recurring services to see the true monthly and yearly cost — including cost per use."
          action={<Button onClick={() => setAddOpen(true)}>+ Add subscription</Button>}
        />
      ) : (
        <>
          <Card title="Renewal calendar" subtitle="Next charges in date order" className="mb-6">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {renewals
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((renewal) => (
                  <div key={renewal.id} className="min-w-40 shrink-0 rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-3">
                    <p className="text-xs text-[var(--gfx-faint)]">{shortDayLabel(renewal.date)}</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-[var(--gfx-text)]">{renewal.name}</p>
                    <p className="tabular mt-1 text-sm text-[var(--gfx-accent)]">{formatCurrency(renewal.amount)}</p>
                  </div>
                ))}
            </div>
          </Card>

          <div className="mb-6 space-y-3">
            {subscriptions.map((sub) => {
              const monthly = normalizeToMonthly(sub.amount, sub.billingCycle)
              const cpu = costPerUse(monthly, sub.usesPerMonth)
              const isCancelled = Boolean(cancelled[sub.id])
              return (
                <Card key={sub.id} as="article" className={isCancelled ? 'opacity-60' : ''}>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      aria-label={`Name of ${sub.name}`}
                      className="min-w-40 flex-1 rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-sm font-medium text-[var(--gfx-text)] transition-colors focus:border-[var(--gfx-accent-strong)] focus:outline-none"
                      value={sub.name}
                      onChange={(e) => updateSubscription(sub.id, { name: e.target.value })}
                    />
                    {cpu !== null && cpu > 50 && <Badge tone="warn">High cost per use</Badge>}
                    {sub.usesPerMonth <= 2 && <Badge tone="info">Low usage</Badge>}
                    {isCancelled && <Badge tone="accent">Simulated cancel</Badge>}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <NumberField label="Cost (R)" value={sub.amount} onChange={(v) => updateSubscription(sub.id, { amount: v })} step={5} prefix="R" />
                    <SelectField
                      label="Billing cycle"
                      value={sub.billingCycle}
                      onChange={(v) => updateSubscription(sub.id, { billingCycle: v })}
                      options={[
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'quarterly', label: 'Quarterly' },
                        { value: 'yearly', label: 'Yearly' },
                      ]}
                    />
                    <NumberField label="Uses per month" value={sub.usesPerMonth} onChange={(v) => updateSubscription(sub.id, { usesPerMonth: v })} min={0} step={1} />
                    <div className="tabular rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
                      <p className="text-xs text-[var(--gfx-faint)]">Cost per use</p>
                      <p className={`text-lg font-semibold ${cpu !== null && cpu > 50 ? 'text-[var(--gfx-warn)]' : 'text-[var(--gfx-text)]'}`}>
                        {cpu === null ? '—' : formatCurrency(cpu)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--gfx-border)] pt-3">
                    <p className="text-xs text-[var(--gfx-faint)]">
                      {formatCurrency(monthly)} per month normalized
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="danger" size="sm" onClick={() => setPendingDelete(sub)}>Remove</Button>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--gfx-muted)]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--gfx-accent-strong)]"
                          checked={isCancelled}
                          onChange={(e) => setCancelled((prev) => ({ ...prev, [sub.id]: e.target.checked }))}
                        />
                        Simulate cancelling
                      </label>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {simMonthlyFreed > 0 && (
            <Card title="Redirect freed money" subtitle="Deterministic: freed money goes where you choose" className="mb-6">
              <div className="flex flex-wrap items-end gap-3">
                <NumberField label="Monthly amount (R)" value={redirectAmount} onChange={setRedirectAmount} step={10} prefix="R" />
                <SelectField
                  label="To goal"
                  value={redirectGoalId}
                  onChange={setRedirectGoalId}
                  options={[{ value: '', label: 'Select a goal…' }, ...goals.map((goal) => ({ value: goal.id, label: goal.name }))]}
                />
                <Button
                  onClick={() => {
                    if (!redirectGoalId || redirectAmount <= 0) return
                    addToGoal(redirectGoalId, redirectAmount)
                    setRedirectAmount(0)
                  }}
                  disabled={!redirectGoalId || redirectAmount <= 0}
                >
                  Move to goal
                </Button>
              </div>
              <p className="mt-3 text-xs text-[var(--gfx-faint)]">
                Cancelling is only simulated here — nothing is sent anywhere, and you can untick at any time.
              </p>
            </Card>
          )}
        </>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add subscription"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd}>Save</Button>
          </>
        }
      >
        <form onSubmit={submitAdd} className="space-y-4">
          <TextField label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Storage plan" />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Cost (R)" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} step={5} prefix="R" />
            <SelectField
              label="Billing cycle"
              value={form.billingCycle}
              onChange={(v) => setForm((f) => ({ ...f, billingCycle: v }))}
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
          </div>
          <NumberField label="Expected uses per month" value={form.usesPerMonth} onChange={(v) => setForm((f) => ({ ...f, usesPerMonth: v }))} min={0} step={1} />
          <button type="submit" className="sr-only">Save</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => removeSubscription(pendingDelete.id)}
        title="Remove subscription?"
        confirmLabel="Remove"
        danger
      >
        <p className="text-sm text-[var(--gfx-muted)]">
          "{pendingDelete?.name}" ({formatCurrency(normalizeToMonthly(pendingDelete?.amount ?? 0, pendingDelete?.billingCycle ?? 'monthly'), { compact: true })}/month) will be removed from tracking.
        </p>
      </ConfirmDialog>

      <Disclaimer>
        Cost-per-use and cancellation totals are local arithmetic on values you entered. They explain
        the trade-off — the decision stays yours, and nothing here is financial advice.
      </Disclaimer>
    </div>
  )
}
