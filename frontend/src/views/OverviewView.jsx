import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { ConfirmDialog } from '../components/ui/Modal.jsx'
import { Badge, Button, Disclaimer, NumberField, StatCard } from '../components/ui/Primitives.jsx'
import { MonthlyColumns } from '../components/charts/Charts.jsx'
import { formatCurrency, formatPercent } from '../lib/format'
import { expensesInMonth } from '../lib/finance'
import { recentMonths } from '../lib/calendar'

export default function OverviewView({ finance }) {
  const { profile, expenses, overview, setIncome, setBalance, setBudget } = finance
  const [confirmingReset, setConfirmingReset] = useState(false)

  const monthExpenses = expensesInMonth(expenses)
  const months = recentMonths(6)
  const spendByMonth = new Map()
  for (const e of expenses) {
    const key = `${new Date(e.date).getFullYear()}-${new Date(e.date).getMonth() + 1}`
    spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + e.amount)
  }

  return (
    <div>
      <PageHeader
        title="Financial overview"
        subtitle="Enter your own numbers — every derived value recalculates instantly in your browser."
      >
        <Badge tone="accent">Your data stays local</Badge>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly income" value={formatCurrency(profile.monthlyIncome, { compact: true })} sub="editable below" />
        <StatCard label="Total spent" value={formatCurrency(overview.totalSpent, { compact: true })} sub={`${monthExpenses.length} expenses logged`} />
        <StatCard
          label="Remaining balance"
          value={formatCurrency(overview.remainingBalance, { compact: true })}
          sub={`from ${formatCurrency(profile.availableBalance, { compact: true })} available`}
          tone={overview.remainingBalance < 0 ? 'danger' : 'accent'}
        />
        <StatCard
          label="Budget remaining"
          value={formatCurrency(overview.budgetRemaining, { compact: true })}
          sub={`${formatPercent(overview.budgetUsed)} of ${formatCurrency(profile.monthlyBudget, { compact: true })} used`}
          tone={overview.overBudget ? 'danger' : 'default'}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="Your numbers" subtitle="Edit any value — totals update everywhere">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField label="Income / month" value={profile.monthlyIncome} onChange={setIncome} step={100} prefix="R" />
            <NumberField label="Available balance" value={profile.availableBalance} onChange={setBalance} step={100} prefix="R" hint="Money you have right now" />
            <NumberField label="Monthly budget" value={profile.monthlyBudget} onChange={setBudget} step={50} prefix="R" hint="Your spending plan" />
          </div>
          <dl className="mt-5 grid gap-3 border-t border-[var(--gfx-border)] pt-4 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--gfx-muted)]">Income − budget (monthly net)</dt>
              <dd className={`tabular font-medium ${finance.net >= 0 ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-danger)]'}`}>
                {formatCurrency(finance.net, { compact: true })}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--gfx-muted)]">Remaining cash (income − spent)</dt>
              <dd className={`tabular font-medium ${overview.savingsThisMonth >= 0 ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-danger)]'}`}>
                {formatCurrency(overview.savingsThisMonth, { compact: true })}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--gfx-muted)]">Projected balance at month end</dt>
              <dd className="tabular font-medium text-[var(--gfx-text)]">{formatCurrency(overview.projectedEndOfMonth, { compact: true })}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--gfx-muted)]">Budget status</dt>
              <dd>
                {overview.overBudget ? <Badge tone="danger">Over budget</Badge> : <Badge tone="accent">Within budget</Badge>}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="6-month spending trend" subtitle="Current month from your ledger; earlier months are demo history">
          <MonthlyColumns
            months={months}
            valueByMonth={(m) => {
              const key = `${m.year}-${m.month}`
              const isCurrent = m.year === new Date().getFullYear() && m.month === new Date().getMonth() + 1
              return isCurrent ? overview.totalSpent : (spendByMonth.get(key) ?? 0)
            }}
          />
        </Card>
      </div>

      <Card title="How the math works" subtitle="No hidden logic — here is every formula" className="mb-6">
        <ul className="space-y-2 text-sm text-[var(--gfx-muted)]">
          <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Remaining balance = available balance − total expenses</li>
          <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Budget remaining = monthly budget − total expenses</li>
          <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Remaining cash = monthly income − total expenses (potential savings — not savings until you record a contribution)</li>
          <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Monthly net = monthly income − monthly budget</li>
        </ul>
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => setConfirmingReset(true)}>
            Reset all data to demo seed
          </Button>
        </div>
      </Card>

      <Disclaimer>
        All figures are deterministic calculations over the values you enter, computed locally in
        your browser. Nothing is sent anywhere, and nothing here is financial advice.
      </Disclaimer>

      <ConfirmDialog
        open={confirmingReset}
        onClose={() => setConfirmingReset(false)}
        onConfirm={finance.resetToDemoData}
        title="Reset to demo data?"
        confirmLabel="Reset everything"
        danger
      >
        <p className="text-sm text-[var(--gfx-muted)]">
          This clears every value you have entered — balance, budget, expenses, goals, and
          subscriptions — and restores the labeled demo data. This cannot be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}
