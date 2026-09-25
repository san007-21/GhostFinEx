import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Alert, Badge, Disclaimer, NumberField, SelectField, TextField } from '../components/ui/Primitives.jsx'
import { ProjectionLine } from '../components/charts/Charts.jsx'
import { formatCurrency } from '../lib/format'
import { monthlyNet, projectBalance, roundMoney, simulateScenario } from '../lib/finance'

/**
 * What-if mode. The user's real state is never mutated: scenarios are pure
 * functions over a snapshot. Actual vs simulated columns are shown side by
 * side and the whole view is clearly labeled as a sandbox.
 */
export default function WhatIfView({ finance }) {
  const { profile, expenses, subscriptions, categories, overview } = finance

  const [type, setType] = useState('purchase')
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const [amount, setAmount] = useState(0)
  const [category, setCategory] = useState('Other')
  const [subscriptionId, setSubscriptionId] = useState('')

  const sim = useMemo(
    () =>
      simulateScenario(
        { profile, expenses, subscriptions },
        { type, name, price, amount, category, subscriptionId },
      ),
    [profile, expenses, subscriptions, type, name, price, amount, category, subscriptionId],
  )

  const actualNet = monthlyNet(profile.monthlyIncome, profile.monthlyBudget)
  const simNet = monthlyNet(sim.profile.monthlyIncome, sim.profile.monthlyBudget)
  const actualPath = useMemo(() => projectBalance(Math.max(overview.availableBalance, 0), actualNet, 6), [overview.availableBalance, actualNet])
  const simPath = useMemo(() => projectBalance(Math.max(sim.overview.projectedEndOfMonth, 0), simNet, 6), [sim.overview.projectedEndOfMonth, simNet])

  const scenarioLabel = {
    purchase: 'Hypothetical purchase',
    expense: 'Hypothetical expense',
    saving: 'Extra monthly saving',
    cancellation: 'Cancel a subscription',
  }[type]

  return (
    <div>
      <PageHeader
        title="What-if mode"
        subtitle="Test a hypothetical decision against your real numbers without changing anything. Nothing here is saved."
      >
        <Badge tone="violet">Sandbox — read-only</Badge>
      </PageHeader>

      <div className="mb-6">
        <Alert tone="info" title="Actual vs. simulation">
          Your real balance, budget, expenses, and subscriptions stay untouched. Everything in the
          right-hand column is a temporary simulation of "{scenarioLabel.toLowerCase()}".
        </Alert>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Build a scenario" subtitle="Pick one and set its numbers" className="lg:col-span-2">
          <SelectField
            label="Scenario type"
            value={type}
            onChange={setType}
            options={[
              { value: 'purchase', label: 'One-off purchase' },
              { value: 'expense', label: 'New recurring expense' },
              { value: 'saving', label: 'Extra saving per month' },
              { value: 'cancellation', label: 'Cancel a subscription' },
            ]}
          />

          <div className="mt-4 space-y-4">
            {(type === 'purchase' || type === 'expense') && (
              <TextField
                label={type === 'purchase' ? 'Item name' : 'Expense name'}
                value={name}
                onChange={setName}
                placeholder={type === 'purchase' ? 'e.g. Refurbished laptop' : 'e.g. Gym membership'}
              />
            )}
            {type === 'purchase' && (
              <NumberField label="Purchase price (R)" value={price} onChange={setPrice} step={100} prefix="R" />
            )}
            {type === 'expense' && (
              <>
                <NumberField label="Amount per month (R)" value={amount} onChange={setAmount} step={50} prefix="R" />
                <SelectField label="Category" value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: c }))} />
              </>
            )}
            {type === 'saving' && (
              <NumberField label="Extra saving per month (R)" value={amount} onChange={setAmount} step={50} prefix="R" hint="Treated as income redirected away from spending" />
            )}
            {type === 'cancellation' && (
              <SelectField
                label="Subscription to cancel"
                value={subscriptionId}
                onChange={setSubscriptionId}
                options={[
                  { value: '', label: 'Choose a subscription…' },
                  ...subscriptions.map((s) => ({ value: s.id, label: `${s.name} (${formatCurrency(s.amount, { compact: true })}/${s.billingCycle === 'monthly' ? 'mo' : s.billingCycle === 'quarterly' ? 'qtr' : 'yr'})` })),
                ]}
              />
            )}
          </div>

          {sim.effects.length > 0 && (
            <div className="mt-5 rounded-xl border border-[rgba(167,139,250,0.35)] bg-[var(--gfx-violet-soft)] p-4 text-sm text-[var(--gfx-muted)]">
              <p className="font-medium text-[var(--gfx-violet)]">Simulation applies:</p>
              <ul className="mt-1 space-y-1">
                {sim.effects.map((effect) => (
                  <li key={effect}>• {effect}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <Card title="Side by side" subtitle="Your actual state vs. the simulation">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* ACTUAL */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Badge tone="accent">Actual data</Badge>
                  <span className="text-xs text-[var(--gfx-faint)]">unchanged</span>
                </div>
                <dl className="tabular space-y-2.5 text-sm">
                  <Row label="Available balance" value={formatCurrency(overview.availableBalance, { compact: true })} />
                  <Row label="Spent this month" value={formatCurrency(overview.monthSpent, { compact: true })} />
                  <Row label="Budget remaining" value={formatCurrency(overview.budgetRemaining, { compact: true })} tone={overview.overBudget ? 'danger' : 'accent'} />
                  <Row label="Projected month-end balance" value={formatCurrency(overview.projectedEndOfMonth, { compact: true })} tone={overview.projectedEndOfMonth < 0 ? 'danger' : 'default'} />
                  <Row label="Monthly net (income − budget)" value={formatCurrency(actualNet, { compact: true })} tone={actualNet >= 0 ? 'accent' : 'danger'} />
                </dl>
              </div>
              {/* SIMULATION */}
              <div className="rounded-xl border border-[rgba(167,139,250,0.35)] bg-[var(--gfx-violet-soft)]/40 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <Badge tone="violet">What-if simulation</Badge>
                  <span className="text-xs text-[var(--gfx-faint)]">not saved</span>
                </div>
                <dl className="tabular space-y-2.5 text-sm">
                  <SimRow label="Balance after" value={formatCurrency(sim.overview.availableBalance, { compact: true })} delta={roundMoney(sim.overview.availableBalance - overview.availableBalance)} />
                  <SimRow label="Spent this month" value={formatCurrency(sim.overview.monthSpent, { compact: true })} delta={roundMoney(sim.overview.monthSpent - overview.monthSpent)} />
                  <SimRow label="Budget remaining" value={formatCurrency(sim.overview.budgetRemaining, { compact: true })} delta={roundMoney(sim.overview.budgetRemaining - overview.budgetRemaining)} tone={sim.overview.overBudget ? 'danger' : 'accent'} />
                  <SimRow label="Projected month-end balance" value={formatCurrency(sim.overview.projectedEndOfMonth, { compact: true })} delta={roundMoney(sim.overview.projectedEndOfMonth - overview.projectedEndOfMonth)} tone={sim.overview.projectedEndOfMonth < 0 ? 'danger' : 'default'} />
                  <SimRow label="Monthly net" value={formatCurrency(simNet, { compact: true })} delta={roundMoney(simNet - actualNet)} tone={simNet >= 0 ? 'accent' : 'danger'} />
                </dl>
              </div>
            </div>
          </Card>

          <Card title="6-month trajectory" subtitle="Straight-line sketch of each path — comparison, not forecast">
            <div className="relative">
              <ProjectionLine points={simPath} tone="violet" />
              <div className="pointer-events-none absolute inset-0">
                <ProjectionLine points={actualPath} tone="accent" />
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[var(--gfx-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--gfx-accent-strong)]" /> Actual plan
              </span>
              <span className="flex items-center gap-1.5 text-[var(--gfx-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--gfx-violet)]" /> Simulated
              </span>
            </div>
            {sim.overview.projectedEndOfMonth < 0 && (
              <div className="mt-3">
                <Alert tone="danger" title="This scenario goes negative">
                  The simulated month-end balance is {formatCurrency(sim.overview.projectedEndOfMonth, { compact: true })} — the trajectory trends below zero.
                </Alert>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Disclaimer>
          Simulations are deterministic recomputations of your own state, applied to a snapshot and
          then discarded. They show consequences of choices — the choice itself stays yours, and
          nothing here is financial advice.
        </Disclaimer>
      </div>
    </div>
  )
}

function Row({ label, value, tone = 'default' }) {
  const toneClass = { default: 'text-[var(--gfx-text)]', accent: 'text-[var(--gfx-accent)]', danger: 'text-[var(--gfx-danger)]' }[tone]
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--gfx-border)]/50 pb-2">
      <dt className="text-[var(--gfx-muted)]">{label}</dt>
      <dd className={`font-semibold ${toneClass}`}>{value}</dd>
    </div>
  )
}

function SimRow({ label, value, delta, tone = 'default' }) {
  const toneClass = { default: 'text-[var(--gfx-text)]', accent: 'text-[var(--gfx-accent)]', danger: 'text-[var(--gfx-danger)]' }[tone]
  const showDelta = delta !== 0
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[rgba(167,139,250,0.2)] pb-2">
      <dt className="text-[var(--gfx-muted)]">{label}</dt>
      <dd className="text-right">
        <span className={`font-semibold ${toneClass}`}>{value}</span>
        {showDelta && (
          <span className={`ml-2 text-xs ${delta > 0 ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-danger)]'}`}>
            {delta > 0 ? '+' : '−'}
            {formatCurrency(Math.abs(delta), { compact: true })}
          </span>
        )}
      </dd>
    </div>
  )
}
