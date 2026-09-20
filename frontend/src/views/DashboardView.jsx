import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Alert, Badge, Button, ProgressBar, StatCard } from '../components/ui/Primitives.jsx'
import { Donut } from '../components/charts/Charts.jsx'
import { formatCurrency, formatDate, formatPercent } from '../lib/format'
import {
  monthlySubscriptionCost,
  remainingIncome,
} from '../lib/finance'
import { buildInsights } from '../lib/insights'

const TONE_TO_ALERT = { danger: 'danger', warn: 'warn', info: 'info', accent: 'accent' }

export default function DashboardView({ finance, onNavigate }) {
  const { profile, budgetLines, goals, subscriptions, expenses, totals, activity, renewals } = finance
  const freeIncome = remainingIncome(profile.monthlyIncome, budgetLines)
  const insights = useMemo(
    () => buildInsights({ profile, budgetLines, goals, subscriptions, totals }),
    [profile, budgetLines, goals, subscriptions, totals],
  )
  const spendData = budgetLines
    .slice()
    .sort((a, b) => b.spent - a.spent)
    .map((line) => ({ label: line.category, value: line.spent }))
  const upcoming = renewals.slice(0, 3)

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile.displayName}`}
        subtitle="Your month at a glance — every number updates as you edit your own values."
      >
        <Badge tone="accent">Demo data</Badge>
        <Button variant="secondary" size="sm" onClick={() => onNavigate('afford')}>
          Can I afford it?
        </Button>
      </PageHeader>

      {/* Hero: the single most important state — free income */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">
              Free monthly income
            </p>
            <p className={`tabular mt-1 text-4xl font-semibold tracking-tight ${freeIncome < 0 ? 'text-[var(--gfx-danger)]' : 'text-[var(--gfx-accent)]'}`}>
              {formatCurrency(freeIncome)}
            </p>
            <p className="mt-1 text-sm text-[var(--gfx-muted)]">
              {formatCurrency(profile.monthlyIncome, { compact: true })} income − {formatCurrency(totals.spent, { compact: true })} spent
            </p>
          </div>
          <div className="min-w-56 flex-1">
            <ProgressBar
              value={totals.utilization}
              tone={totals.overBudget ? 'danger' : totals.utilization > 0.85 ? 'warn' : 'accent'}
              label="Plan used"
            />
            <p className="mt-2 text-xs text-[var(--gfx-faint)]">
              {formatPercent(totals.utilization)} of the {formatCurrency(totals.planned, { compact: true })} plan spent
            </p>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Left to allocate" value={formatCurrency(finance.unallocated, { compact: true })} sub="Income minus plan" tone={finance.unallocated < 0 ? 'warn' : 'default'} />
        <StatCard label="Subscriptions" value={formatCurrency(monthlySubscriptionCost(subscriptions), { compact: true })} sub="per month" tone="info" />
        <StatCard label="Goals" value={String(goals.length)} sub={`${goals.filter((g) => g.saved >= g.target).length} complete`} />
        <StatCard label="Expenses logged" value={String(expenses.length)} sub="this month" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card title="What Ghost sees" subtitle="Deterministic observations from your numbers" className="lg:col-span-2">
          <div className="space-y-3">
            {insights.slice(0, 4).map((insight) => (
              <Alert key={insight.id} tone={TONE_TO_ALERT[insight.severity] ?? 'info'}>
                <p className="font-medium text-[var(--gfx-text)]">{insight.title}</p>
                <p className="mt-0.5">{insight.detail}</p>
                <button
                  type="button"
                  onClick={() => onNavigate(insight.route.replace('/', ''))}
                  className="mt-1.5 text-xs font-medium text-[var(--gfx-accent)] underline-offset-2 hover:underline"
                >
                  Review →
                </button>
              </Alert>
            ))}
          </div>
        </Card>

        <Card title="Spending mix" subtitle="Where money went this month">
          <Donut data={spendData.slice(0, 5)} centerLabel="spent" centerValue={formatCurrency(totals.spent, { compact: true })} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Recent activity"
          subtitle="Local demo trail of your actions"
          actions={<Button variant="ghost" size="sm" onClick={() => onNavigate('expenses')}>View expenses</Button>}
        >
          <ul className="space-y-3">
            {activity.slice(0, 5).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-[var(--gfx-text)]">{entry.label}</p>
                  <p className="text-xs text-[var(--gfx-faint)]">{formatDate(entry.date)}</p>
                </div>
                <Badge tone={entry.tone === 'neutral' ? 'neutral' : entry.tone}>{entry.detail}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Upcoming renewals"
          subtitle="Next subscription charges"
          actions={<Button variant="ghost" size="sm" onClick={() => onNavigate('subscriptions')}>Manage</Button>}
        >
          <ul className="space-y-3">
            {upcoming.map((renewal) => (
              <li key={renewal.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-[var(--gfx-text)]">{renewal.name}</p>
                  <p className="text-xs text-[var(--gfx-faint)]">{formatDate(renewal.date)}</p>
                </div>
                <span className="tabular text-[var(--gfx-text)]">{formatCurrency(renewal.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
