import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Modal, { ConfirmDialog } from '../components/ui/Modal.jsx'
import { Alert, Badge, Button, Disclaimer, EmptyState, NumberField, ProgressBar, SelectField, StatCard, TextField } from '../components/ui/Primitives.jsx'
import { formatCurrency, formatDate } from '../lib/format'
import { normalizeToMonthly, roundMoney, subscriptionBurden, upcomingRenewals } from '../lib/finance'
import { dueLabel, daysUntil, shortDayLabel } from '../lib/calendar'
import { IconRepeat } from '../components/ui/icons.jsx'

const EMPTY_SUB = { name: '', amount: 0, billingCycle: 'monthly', nextBillingDate: '' }
const CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export default function SubscriptionsView({ finance, onNavigate }) {
  const { subscriptions, profile, addSubscription, updateSubscription, removeSubscription } = finance

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_SUB)
  const [formError, setFormError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)

  const burden = subscriptionBurden(subscriptions, profile.monthlyIncome, profile.monthlyBudget)
  const renewals = upcomingRenewals(subscriptions, 6)

  const submitAdd = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return setFormError('Give the subscription a name.')
    if (form.amount <= 0) return setFormError('Amount must be greater than zero.')
    if (!form.nextBillingDate) return setFormError('Pick the next billing date.')
    addSubscription({ name, amount: roundMoney(form.amount), billingCycle: form.billingCycle, nextBillingDate: form.nextBillingDate })
    setForm(EMPTY_SUB)
    setFormError('')
    setAddOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle="Your recurring costs, normalized to monthly so yearly and monthly plans compare fairly."
      >
        <Button onClick={() => { setFormError(''); setAddOpen(true) }}>+ Add subscription</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly burden" value={formatCurrency(burden.monthly, { compact: true })} sub={`${subscriptions.length} subscriptions`} />
        <StatCard label="Yearly burden" value={formatCurrency(burden.yearly, { compact: true })} sub="what the leaks add up to" tone="info" />
        <StatCard label="Share of income" value={`${Math.round(burden.shareOfIncome * 100)}%`} sub={`of ${formatCurrency(profile.monthlyIncome, { compact: true })}`} tone={burden.shareOfIncome > 0.15 ? 'warn' : 'default'} />
        <StatCard label="Share of budget" value={`${Math.round(burden.shareOfBudget * 100)}%`} sub={`of ${formatCurrency(profile.monthlyBudget, { compact: true })}`} tone={burden.shareOfBudget > 0.2 ? 'warn' : 'default'} />
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={IconRepeat}
          title="No subscriptions tracked"
          description="Add your recurring services — streaming, storage, data — to see the true monthly and yearly cost of the quiet leaks."
          action={<Button onClick={() => setAddOpen(true)}>+ Add subscription</Button>}
        />
      ) : (
        <>
          {burden.shareOfIncome > 0.15 && (
            <div className="mb-6">
              <Alert tone="warn" title="Subscription burden is above 15% of income">
                Recurring charges take {formatCurrency(burden.monthly, { compact: true })} of your {formatCurrency(profile.monthlyIncome, { compact: true })} income each month. Cancelling one service is a lever worth testing in the What-if simulation.
              </Alert>
            </div>
          )}

          <Card title="Renewal timeline" subtitle="Next billing dates in order" className="mb-6">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {renewals.map((sub) => {
                const days = daysUntil(sub.nextBillingDate)
                return (
                  <div key={sub.id} className="min-w-44 shrink-0 rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[var(--gfx-faint)]">{shortDayLabel(sub.nextBillingDate)}</p>
                      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${days >= 0 && days <= 7 ? 'border-[rgba(96,165,250,0.4)] bg-[var(--gfx-info-soft)] text-[var(--gfx-info)]' : 'border-[var(--gfx-border)] bg-[var(--gfx-surface-3)] text-[var(--gfx-muted)]'}`}>
                        {dueLabel(days)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium text-[var(--gfx-text)]">{sub.name}</p>
                    <p className="tabular mt-1 text-sm text-[var(--gfx-accent)]">{formatCurrency(sub.amount)} · {sub.billingCycle}</p>
                  </div>
                )
              })}
            </div>
          </Card>

          <div className="mb-6 space-y-3">
            {subscriptions.map((sub) => {
              const monthly = normalizeToMonthly(sub.amount, sub.billingCycle)
              const yearly = roundMoney(monthly * 12)
              const share = burden.monthly > 0 ? monthly / burden.monthly : 0
              return (
                <Card key={sub.id} as="article">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      aria-label={`Name of ${sub.name}`}
                      className="min-w-40 flex-1 rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-sm font-medium text-[var(--gfx-text)] transition-colors focus:border-[var(--gfx-accent-strong)] focus:outline-none"
                      value={sub.name}
                      onChange={(e) => updateSubscription(sub.id, { name: e.target.value })}
                    />
                    <Badge tone="info">{formatCurrency(yearly, { compact: true })}/year</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <NumberField label="Amount (R)" value={sub.amount} onChange={(v) => updateSubscription(sub.id, { amount: v })} step={5} prefix="R" />
                    <SelectField label="Billing frequency" value={sub.billingCycle} onChange={(v) => updateSubscription(sub.id, { billingCycle: v })} options={CYCLES} />
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Next billing date</span>
                      <input type="date" className="date-input" value={sub.nextBillingDate} onChange={(e) => updateSubscription(sub.id, { nextBillingDate: e.target.value })} />
                    </label>
                    <div className="tabular rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
                      <p className="text-xs text-[var(--gfx-faint)]">Normalized</p>
                      <p className="text-lg font-semibold text-[var(--gfx-text)]">{formatCurrency(monthly)}/mo</p>
                      <p className="text-xs text-[var(--gfx-faint)]">next: {formatDate(sub.nextBillingDate)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={share} tone="info" label={`Share of subscription burden — ${Math.round(share * 100)}%`} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--gfx-border)] pt-3">
                    <p className="text-xs text-[var(--gfx-faint)]">
                      {formatCurrency(monthly)} per month · {formatCurrency(yearly)} per year
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onNavigate('whatif')}>
                        Test cancelling
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setPendingDelete(sub)}>Remove</Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
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
          <TextField label="Service name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Cloud storage" />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Amount (R)" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} step={5} prefix="R" />
            <SelectField label="Billing frequency" value={form.billingCycle} onChange={(v) => setForm((f) => ({ ...f, billingCycle: v }))} options={CYCLES} />
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Next billing date</span>
            <input type="date" className="date-input" value={form.nextBillingDate} onChange={(e) => setForm((f) => ({ ...f, nextBillingDate: e.target.value }))} />
          </label>
          {formError && <p role="alert" className="text-sm text-[var(--gfx-danger)]">{formError}</p>}
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
        Burden totals are local arithmetic on values you entered — normalized monthly cost, share of
        income and budget. Cancelling is never done for you; the What-if view lets you test it safely.
      </Disclaimer>
    </div>
  )
}
