import { useMemo } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Alert, Badge, Button, EmptyState, ProgressBar, StatCard } from '../components/ui/Primitives.jsx'
import { Donut } from '../components/charts/Charts.jsx'
import { formatCurrency, formatDate, formatPercent } from '../lib/format'
import { expensesByCategory, subscriptionBurden } from '../lib/finance'
import { dueLabel } from '../lib/calendar'
import { deriveCalendarEvents, nextUpcoming } from '../lib/events'
import { buildInsights } from '../lib/insights'

const TONE_TO_ALERT = { danger: 'danger', warn: 'warn', info: 'info', accent: 'accent' }

export default function DashboardView({ finance, onNavigate }) {
  const { profile, expenses, goals, subscriptions, plannedExpenses, overview, activityLog } = finance
  const insights = useMemo(
    () => buildInsights({ profile, expenses, goals, subscriptions, overview }),
    [profile, expenses, goals, subscriptions, overview],
  )
  const spendData = useMemo(
    () => expensesByCategory(expenses).map((entry) => ({ label: entry.category, value: entry.total })),
    [expenses],
  )
  const burden = subscriptionBurden(subscriptions, profile.monthlyIncome, profile.monthlyBudget)
  const upcomingDue = useMemo(
    () =>
      nextUpcoming(
        deriveCalendarEvents({ goals, subscriptions, plannedExpenses, expenses }),
        5,
      ),
    [goals, subscriptions, plannedExpenses, expenses],
  )

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile.displayName}`}
        subtitle="Your money at a glance — every number updates as you edit your own values."
      >
        <Badge tone="accent">Demo data</Badge>
        <Button variant="secondary" size="sm" onClick={() => onNavigate('afford')}>
          Can I afford it?
        </Button>
      </PageHeader>

      {/* Hero: balance state, the single most important number */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">
              Balance after logged expenses
            </p>
            <p className={`tabular mt-1 text-4xl font-semibold tracking-tight ${overview.remainingBalance < 0 ? 'text-[var(--gfx-danger)]' : 'text-[var(--gfx-accent)]'}`}>
              {formatCurrency(overview.remainingBalance)}
            </p>
            <p className="mt-1 text-sm text-[var(--gfx-muted)]">
              {formatCurrency(profile.availableBalance, { compact: true })} available − {formatCurrency(overview.totalSpent, { compact: true })} spent
            </p>
          </div>
          <div className="min-w-56 flex-1">
            <ProgressBar
              value={overview.budgetUsed}
              tone={overview.overBudget ? 'danger' : overview.budgetUsed > 0.85 ? 'warn' : 'accent'}
              label="Budget used"
            />
            <p className="mt-2 text-xs text-[var(--gfx-faint)]">
              {formatPercent(overview.budgetUsed)} of the {formatCurrency(profile.monthlyBudget, { compact: true })} budget spent
              {overview.overBudget ? ' — over budget' : ''}
            </p>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly income" value={formatCurrency(profile.monthlyIncome, { compact: true })} />
        <StatCard label="Saved this month" value={formatCurrency(overview.savingsThisMonth, { compact: true })} sub="income − spent" tone={overview.savingsThisMonth >= 0 ? 'accent' : 'danger'} />
        <StatCard label="Subscription burden" value={formatCurrency(burden.monthly, { compact: true })} sub={`${Math.round(burden.shareOfIncome * 100)}% of income`} tone="info" />
        <StatCard label="Goals" value={String(goals.length)} sub={`${goals.filter((g) => g.saved >= g.target).length} complete`} />
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
          {spendData.length === 0 ? (
            <EmptyState
              icon={null}
              title="No expenses yet"
              description="Your spending mix appears once expenses are logged."
              action={<Button size="sm" onClick={() => onNavigate('expenses')}>Log an expense</Button>}
            />
          ) : (
            <Donut data={spendData.slice(0, 5)} centerLabel="spent" centerValue={formatCurrency(overview.totalSpent, { compact: true })} />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Recent activity"
          subtitle="Generated from your actions in the app"
          actions={<Button variant="ghost" size="sm" onClick={() => onNavigate('expenses')}>View expenses</Button>}
        >
          {activityLog.length === 0 ? (
            <EmptyState
              icon={null}
              title="No activity yet"
              description="Actions you take — adding expenses, funding goals, editing subscriptions — will appear here."
              action={<Button size="sm" onClick={() => onNavigate('expenses')}>Log an expense</Button>}
            />
          ) : (
            <ul className="space-y-3">
              {activityLog.slice(0, 6).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-[var(--gfx-text)]">{entry.label}</p>
                    <p className="text-xs text-[var(--gfx-faint)]">{formatDate(entry.date)}</p>
                  </div>
                  <Badge tone={entry.tone === 'neutral' ? 'neutral' : entry.tone}>{entry.detail}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Upcoming due dates"
          subtitle="Renewals, targets, and plans ahead"
          actions={<Button variant="ghost" size="sm" onClick={() => onNavigate('calendar')}>Open calendar</Button>}
        >
          {upcomingDue.length === 0 ? (
            <EmptyState
              icon={null}
              title="Nothing due soon"
              description="Subscription renewals, savings targets, and planned expenses will appear here."
              action={<Button size="sm" onClick={() => onNavigate('calendar')}>Open calendar</Button>}
            />
          ) : (
            <ul className="space-y-3">
              {upcomingDue.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-[var(--gfx-text)]">{event.title}</p>
                    <p className="text-xs text-[var(--gfx-faint)]">{formatDate(event.date)} · {kindShort(event.kind)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {event.amount !== null && event.amount !== undefined && (
                      <span className="tabular text-[var(--gfx-text)]">{formatCurrency(event.amount, { compact: true })}</span>
                    )}
                    <span className="text-xs text-[var(--gfx-muted)]">{dueLabel(event.daysRemaining)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function kindShort(kind) {
  return { billing: 'Billing', deadline: 'Savings target', planned: 'Planned', expense: 'Expense', budget: 'Budget reset' }[kind] ?? 'Event'
}
