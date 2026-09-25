import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Badge, Button, Disclaimer, EmptyState, ProgressBar, StatCard } from '../components/ui/Primitives.jsx'
import { CategoryBars, Donut } from '../components/charts/Charts.jsx'
import { formatCurrency, formatPercent } from '../lib/format'
import { expensesByCategory, roundMoney } from '../lib/finance'
import { IconPie } from '../components/ui/icons.jsx'

export default function SpendingView({ finance, onNavigate }) {
  const { expenses, overview, profile } = finance

  // Derived directly from the ledger, so any add/remove updates this view.
  const categoryTotals = useMemo(() => expensesByCategory(expenses), [expenses])
  const chartData = useMemo(
    () => categoryTotals.map((entry) => ({ label: entry.category, value: entry.total })),
    [categoryTotals],
  )
  const topCategory = categoryTotals[0]

  if (expenses.length === 0) {
    return (
      <div>
        <PageHeader title="Spending breakdown" subtitle="Where your money actually goes." />
        <EmptyState
          icon={IconPie}
          title="Nothing to break down yet"
          description="Log expenses and this analysis builds itself — categories, shares, and your biggest mover."
          action={<Button onClick={() => onNavigate('expenses')}>Go to Expenses</Button>}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Spending breakdown"
        subtitle="Calculated live from your expense ledger — add or remove an expense and it updates."
      >
        <Button variant="secondary" size="sm" onClick={() => onNavigate('expenses')}>Edit expenses</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total spent (all time)" value={formatCurrency(overview.totalSpent, { compact: true })} sub={`${expenses.length} expenses`} />
        <StatCard
          label="Share of income"
          value={formatPercent(profile.monthlyIncome > 0 ? overview.monthSpent / profile.monthlyIncome : 0)}
          sub={`of ${formatCurrency(profile.monthlyIncome, { compact: true })} · this month: ${formatCurrency(overview.monthSpent, { compact: true })}`}
        />
        <StatCard
          label="Share of budget"
          value={formatPercent(overview.budgetUsed)}
          sub={overview.overBudget ? 'over budget' : 'within budget'}
          tone={overview.overBudget ? 'danger' : 'accent'}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="Composition" subtitle="Share of total spending">
          <Donut data={chartData.slice(0, 6)} centerLabel="spent" centerValue={formatCurrency(overview.totalSpent, { compact: true })} />
          {chartData.length > 6 && (
            <p className="mt-3 text-xs text-[var(--gfx-faint)]">
              Top 6 shown; the rest is {formatCurrency(roundMoney(chartData.slice(6).reduce((s, d) => s + d.value, 0)), { compact: true })}.
            </p>
          )}
        </Card>

        <Card title="All categories" subtitle="Highest to lowest — whole ledger">
          <CategoryBars data={chartData} tone="info" />
          <p className="mt-4 text-xs text-[var(--gfx-faint)]">
            Categories not shown have no spending logged this month.
          </p>
        </Card>
      </div>

      <Card title="Category detail" subtitle="Every category, ranked with its share" className="mb-6">
        <ul className="space-y-4">
          {categoryTotals.map((entry) => {
            const share = overview.totalSpent > 0 ? entry.total / overview.totalSpent : 0
            const isTop = entry.category === topCategory?.category
            return (
              <li key={entry.category}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-[var(--gfx-text)]">
                    {entry.category}
                    {isTop && <Badge tone="warn">Biggest</Badge>}
                  </span>
                  <span className="tabular text-sm text-[var(--gfx-muted)]">
                    {formatCurrency(entry.total, { compact: true })} · {formatPercent(share)}
                  </span>
                </div>
                <ProgressBar value={share} tone={isTop ? 'warn' : 'info'} />
              </li>
            )
          })}
        </ul>
      </Card>

      <Disclaimer>
        This breakdown is arithmetic over your own entries. It names what is largest and what it
        means for your budget — the interpretation and the next move stay yours.
      </Disclaimer>
    </div>
  )
}
