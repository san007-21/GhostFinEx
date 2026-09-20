import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Badge, Disclaimer, ProgressBar, StatCard } from '../components/ui/Primitives.jsx'
import { MonthlyColumns } from '../components/charts/Charts.jsx'
import { formatCurrency, formatDate, formatPercent } from '../lib/format'
import {
  monthlySubscriptionCost,
  progressToward,
  remainingIncome,
  roundMoney,
  weeklyAmountNeeded,
  weeksUntil,
  yearlySubscriptionCost,
} from '../lib/finance'
import { recentMonths } from '../lib/calendar'


export default function OverviewView({ finance }) {
  const { profile, budgetLines, goals, subscriptions, expenses, totals } = finance

  const budgetRemaining = remainingIncome(profile.monthlyIncome, budgetLines)
  const subsMonthly = monthlySubscriptionCost(subscriptions)
  const subsYearly = yearlySubscriptionCost(subscriptions)

  // Deterministic demo trend: current month from the ledger, prior months
  // derived from plan (mock history, clearly part of the demo seed).
  const months = useMemo(() => recentMonths(6), [])
  const thisMonthKey = `${months[months.length - 1].year}-${months[months.length - 1].month}`
  const spendByMonth = useMemo(() => {
    const map = new Map()
    for (const e of expenses) {
      const key = `${new Date(e.date).getFullYear()}-${new Date(e.date).getMonth() + 1}`
      map.set(key, roundMoneySafe((map.get(key) ?? 0) + e.amount))
    }
    return map
  }, [expenses])

  return (
    <div>
      <PageHeader
        title="Financial overview"
        subtitle="The complete picture: income, plan vs. actuals, goals, and recurring costs."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly income" value={formatCurrency(profile.monthlyIncome, { compact: true })} sub={`${profile.incomeSources.length} sources`} />
        <StatCard label="Budget remaining" value={formatCurrency(budgetRemaining, { compact: true })} sub={`${formatPercent(totals.utilization)} of plan used`} tone={budgetRemaining < 0 ? 'danger' : 'accent'} />
        <StatCard label="Left to allocate" value={formatCurrency(finance.unallocated, { compact: true })} sub={finance.unallocated < 0 ? 'Plan over-committed' : 'Unplanned so far'} tone={finance.unallocated < 0 ? 'warn' : 'default'} />
        <StatCard label="Subscriptions / year" value={formatCurrency(subsYearly, { compact: true })} sub={`${formatCurrency(subsMonthly, { compact: true })} per month`} tone="info" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="Income sources" subtitle="Only reliable income belongs here">
          <ul className="space-y-3">
            {profile.incomeSources.map((source) => {
              const share = profile.monthlyIncome > 0 ? source.monthlyAmount / profile.monthlyIncome : 0
              return (
                <li key={source.id}>
                  <ProgressBar value={share} tone="info" label={`${source.label} — ${formatCurrency(source.monthlyAmount, { compact: true })}`} />
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-xs text-[var(--gfx-faint)]">
            Irregular income (tips, gigs) is best treated as a bonus, never as rent money.
          </p>
        </Card>

        <Card title="6-month spending trend" subtitle="Current month is your real ledger; earlier months are demo history">
          <MonthlyColumns
            months={months}
            valueByMonth={(m) => {
              const key = `${m.year}-${m.month}`
              return key === thisMonthKey ? totals.spent : (spendByMonth.get(key) ?? 0)
            }}
          />
        </Card>
      </div>

      <Card
        title="Plan vs. actual"
        subtitle="Every category, side by side"
        className="mb-6"
        actions={<Badge tone={totals.overBudget ? 'danger' : 'accent'}>{formatPercent(totals.utilization)} used</Badge>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--gfx-border)] text-left text-xs uppercase tracking-wide text-[var(--gfx-faint)]">
                <th className="pb-2 pr-4 font-medium">Category</th>
                <th className="pb-2 pr-4 text-right font-medium">Planned</th>
                <th className="pb-2 pr-4 text-right font-medium">Spent</th>
                <th className="pb-2 pr-4 text-right font-medium">Difference</th>
                <th className="hidden pb-2 font-medium sm:table-cell">Progress</th>
              </tr>
            </thead>
            <tbody>
              {budgetLines.map((line) => {
                const diff = roundMoney(line.planned - line.spent)
                const over = diff < 0
                return (
                  <tr key={line.id} className="border-b border-[var(--gfx-border)]/60">
                    <td className="py-2.5 pr-4 text-[var(--gfx-text)]">{line.category}</td>
                    <td className="tabular py-2.5 pr-4 text-right text-[var(--gfx-muted)]">{formatCurrency(line.planned, { compact: true })}</td>
                    <td className="tabular py-2.5 pr-4 text-right text-[var(--gfx-text)]">{formatCurrency(line.spent, { compact: true })}</td>
                    <td className={`tabular py-2.5 pr-4 text-right ${over ? 'text-[var(--gfx-danger)]' : 'text-[var(--gfx-accent)]'}`}>
                      {over ? '−' : '+'}
                      {formatCurrency(Math.abs(diff), { compact: true })}
                    </td>
                    <td className="hidden py-2.5 sm:table-cell">
                      <ProgressBar
                        value={line.planned > 0 ? line.spent / line.planned : 1}
                        tone={over ? 'danger' : line.spent / line.planned > 0.85 ? 'warn' : 'accent'}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Savings goals" subtitle="Progress and weekly requirements" className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const weeks = weeksUntil(goal.deadline)
            const weeklyNeed = weeklyAmountNeeded(goal.target, goal.saved, weeks)
            const progress = progressToward(goal.saved, goal.target)
            return (
              <div key={goal.id} className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-[var(--gfx-text)]">{goal.name}</p>
                  <Badge tone={weeklyNeed === 0 ? 'accent' : 'neutral'}>{formatPercent(progress)}</Badge>
                </div>
                <ProgressBar className="mt-3" value={progress} tone={weeklyNeed === 0 ? 'accent' : progress < 0.3 ? 'warn' : 'info'} />
                <p className="mt-2 text-xs text-[var(--gfx-faint)]">
                  Due {formatDate(goal.deadline)} ·{' '}
                  {weeklyNeed === 0 ? 'On track' : `${formatCurrency(weeklyNeed, { compact: true })}/week`}
                </p>
              </div>
            )
          })}
        </div>
      </Card>

      <Disclaimer>
        Figures are computed in your browser from your entries. They explain your situation — they do
        not tell you what to do, and they are not financial advice.
      </Disclaimer>
    </div>
  )
}

function roundMoneySafe(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
