import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { ConfirmDialog } from '../components/ui/Modal.jsx'
import { Badge, Button, Disclaimer, NumberField, StatCard } from '../components/ui/Primitives.jsx'
import { MonthlyColumns } from '../components/charts/Charts.jsx'
import { formatCurrency, formatPercent } from '../lib/format'
import { expensesInMonth } from '../lib/finance'
import { parseIsoDate, recentMonths } from '../lib/calendar'

export default function OverviewView({ finance }) {
  const { profile, expenses, overview, setIncome, setBalance, setBudget } = finance
  const [confirmingReset, setConfirmingReset] = useState(false)

  const monthExpenses = expensesInMonth(expenses)
  const months = recentMonths(6)
  const spendByMonth = new Map()
  for (const e of expenses) {
    // Local parse: new Date('YYYY-MM-DD') is UTC and can shift the month key.
    const d = parseIsoDate(e.date)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
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
        <StatCard label="Spent this month" value={formatCurrency(overview.monthSpent, { compact: true })} sub={`${monthExpenses.length} expenses logged this month`} />
        <StatCard
          label="Current balance"
          value={formatCurrency(overview.availableBalance, { compact: true })}
          sub="from your accounts — see Accounts view"
          tone={overview.availableBalance < 0 ? 'danger' : 'accent'}
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
            <NumberField
              label="Available balance"
              value={profile.availableBalance}
              onChange={setBalance}
              step={100}
              prefix="R"
              readOnly
              className="cursor-default opacity-90"
              hint="Sum of your account balances — edit them in the Accounts view"
            />
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
              <dt className="text-[var(--gfx-muted)]">Remaining cash (income − spent this month)</dt>
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

        <Card title="6-month spending trend" subtitle="Each month from your ledger — no mixed scopes">
          <MonthlyColumns
            months={months}
            valueByMonth={(m) => spendByMonth.get(`${m.year}-${m.month}`) ?? 0}
          />

          <p className="mt-3 text-xs text-[var(--gfx-faint)]">All-time ledger total: {formatCurrency(overview.totalSpent, { compact: true })} across {expenses.length} expenses.</p>
        </Card>
      </div>

      <Card title="How the math works" subtitle="No hidden logic — here is every formula" className="mb-6">
        <ul className="space-y-2 text-sm text-[var(--gfx-muted)]">
          <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Current balance = sum of your account balances (maintained in Accounts)</li>
          <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Spent this month = expenses dated in this calendar month</li>
          <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Budget remaining = monthly budget − spent this month</li>
          <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Remaining cash = monthly income − spent this month (potential savings — not savings until you record a contribution)</li>
          <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Monthly net = monthly income − monthly budget</li>
          <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Projected month-end balance = current balance + monthly net</li>
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
