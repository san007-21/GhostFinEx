import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Badge, Button, Disclaimer, EmptyState, ProgressBar } from '../components/ui/Primitives.jsx'
import { CategoryBars, Donut } from '../components/charts/Charts.jsx'
import { formatCurrency, formatPercent } from '../lib/format'
import { roundMoney } from '../lib/finance'
import { IconPie } from '../components/ui/icons.jsx'

export default function SpendingView({ finance, onNavigate }) {
  const { budgetLines, totals, profile } = finance

  const spendData = useMemo(
    () => budgetLines.map((line) => ({ label: line.category, value: line.spent })).sort((a, b) => b.value - a.value),
    [budgetLines],
  )

  // Biggest movers: planned vs spent, sorted by absolute over/under.
  const movers = useMemo(
    () =>
      budgetLines
        .map((line) => ({ ...line, diff: roundMoney(line.planned - line.spent) }))
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 4),
    [budgetLines],
  )

  const shareOfIncome = profile.monthlyIncome > 0 ? totals.spent / profile.monthlyIncome : 0
  const topCategory = spendData[0]

  if (budgetLines.length === 0) {
    return (
      <div>
        <PageHeader title="Spending breakdown" subtitle="Where your money actually goes." />
        <EmptyState
          icon={IconPie}
          title="No categories to break down yet"
          description="Add budget categories in the Expenses view and this analysis builds itself."
          action={<Button onClick={() => onNavigate('expenses')}>Go to Expenses</Button>}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Spending breakdown"
        subtitle="Understand the shape of your spending before changing anything."
      >
        <Button variant="secondary" size="sm" onClick={() => onNavigate('expenses')}>Edit categories</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="Composition" subtitle="Share of total spending this month">
          <Donut data={spendData.slice(0, 5)} centerLabel="spent" centerValue={formatCurrency(totals.spent, { compact: true })} />
          {spendData.length > 5 && (
            <p className="mt-3 text-xs text-[var(--gfx-faint)]">
              Top 5 shown; remaining {formatCurrency(spendData.slice(5).reduce((s, d) => s + d.value, 0), { compact: true })} spread across {spendData.length - 5} more categories.
            </p>
          )}
        </Card>

        <Card title="All categories" subtitle="Highest to lowest">
          <CategoryBars data={spendData} tone="info" />
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="Biggest movers" subtitle="Largest gaps between plan and reality">
          <ul className="space-y-4">
            {movers.map((line) => {
              const over = line.diff < 0
              return (
                <li key={line.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="text-sm text-[var(--gfx-text)]">{line.category}</span>
                    <Badge tone={over ? 'danger' : 'accent'}>
                      {over ? '−' : '+'}
                      {formatCurrency(Math.abs(line.diff), { compact: true })} vs plan
                    </Badge>
                  </div>
                  <ProgressBar
                    value={line.planned > 0 ? line.spent / line.planned : 1}
                    tone={over ? 'danger' : line.spent / line.planned > 0.85 ? 'warn' : 'accent'}
                  />
                </li>
              )
            })}
          </ul>
        </Card>

        <Card title="Reading your spending" subtitle="Explain first, decide later">
          <ul className="space-y-3 text-sm text-[var(--gfx-muted)]">
            <li className="flex gap-2">
              <span className="text-[var(--gfx-accent)]">•</span>
              <span>
                <strong className="text-[var(--gfx-text)]">{topCategory?.label}</strong> is your largest
                category at {formatCurrency(topCategory?.value ?? 0, { compact: true })} —{' '}
                {formatPercent(topCategory?.value ? topCategory.value / totals.spent : 0)} of all spending.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--gfx-accent)]">•</span>
              <span>
                You have used <strong className="text-[var(--gfx-text)]">{formatPercent(shareOfIncome)}</strong>{' '}
                of monthly income ({formatCurrency(totals.spent, { compact: true })} of{' '}
                {formatCurrency(profile.monthlyIncome, { compact: true })}).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--gfx-accent)]">•</span>
              <span>
                {totals.overBudget
                  ? 'Spending has passed the plan — the breakdown shows exactly where the pressure is.'
                  : 'You are still inside the plan — a good moment to decide where any surplus should go.'}
              </span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => onNavigate('whatif')}>Try a what-if</Button>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('goals')}>Fund a goal</Button>
          </div>
        </Card>
      </div>

      <Disclaimer>
        This breakdown is arithmetic over your own entries. It names what is largest and what drifted
        — the interpretation and the next move stay yours.
      </Disclaimer>
    </div>
  )
}
