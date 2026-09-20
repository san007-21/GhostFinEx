import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Alert, Badge, Button, Disclaimer, NumberField, ProgressBar } from '../components/ui/Primitives.jsx'
import { ProjectionLine } from '../components/charts/Charts.jsx'
import { formatCurrency } from '../lib/format'
import { remainingIncome, roundMoney, savingsPlan } from '../lib/finance'

export default function AffordView({ finance, onNavigate }) {
  const { profile, budgetLines, goals } = finance

  const [name, setName] = useState('')
  const [price, setPrice] = useState(4500)
  const [alreadySaved, setAlreadySaved] = useState(0)
  const [monthlySaving, setMonthlySaving] = useState(0)

  const freeIncome = remainingIncome(profile.monthlyIncome, budgetLines)
  const plan = useMemo(
    () => savingsPlan(price, alreadySaved, monthlySaving, freeIncome),
    [price, alreadySaved, monthlySaving, freeIncome],
  )

  const verdictTone = !plan.gap ? 'accent' : plan.monthsNeeded === null ? 'info' : plan.shareOfFreeIncome !== null && plan.shareOfFreeIncome > 1 ? 'danger' : plan.shareOfFreeIncome > 0.5 ? 'warn' : 'accent'

  const projection = useMemo(() => {
    if (plan.monthsNeeded === null || plan.monthsNeeded === 0) return null
    const points = [alreadySaved]
    let balance = alreadySaved
    const capped = Math.min(plan.monthsNeeded, 24)
    for (let i = 0; i < capped; i += 1) {
      balance = roundMoney(balance + monthlySaving)
      points.push(Math.min(balance, price))
    }
    return points
  }, [plan, alreadySaved, monthlySaving, price])

  // Deterministic "where could the money come from" options, ranked.
  const sources = useMemo(() => {
    const options = []
    const unallocated = finance.unallocated
    if (unallocated > 0) {
      options.push({ label: 'Unallocated income', monthly: unallocated, route: '/budget', note: 'Income you have not planned yet' })
    }
    const lowUse = finance.subscriptions.filter((s) => s.usesPerMonth <= 2)
    for (const sub of lowUse) {
      options.push({
        label: `Cancel: ${sub.name}`,
        monthly: normalize(sub),
        route: '/subscriptions',
        note: 'Currently used twice a month or less',
      })
    }
    return options.sort((a, b) => b.monthly - a.monthly)
  }, [finance.unallocated, finance.subscriptions])

  return (
    <div>
      <PageHeader
        title="Can I afford this?"
        subtitle="Run the numbers on a purchase before you make it — no judgment, just arithmetic."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="The purchase" subtitle="Describe it and the math does the rest" className="lg:col-span-2">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">What is it? (optional)</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Refurbished laptop"
                className="w-full rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-sm text-[var(--gfx-text)] placeholder:text-[var(--gfx-faint)] focus:border-[var(--gfx-accent-strong)] focus:outline-none"
              />
            </label>
            <NumberField label="Price (R)" value={price} onChange={setPrice} step={100} prefix="R" />
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Already saved (R)" value={alreadySaved} onChange={setAlreadySaved} step={100} prefix="R" />
              <NumberField label="Can save per month (R)" value={monthlySaving} onChange={setMonthlySaving} step={100} prefix="R" />
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
            <p className="text-xs text-[var(--gfx-faint)]">Free monthly income</p>
            <p className="tabular text-xl font-semibold text-[var(--gfx-text)]">{formatCurrency(freeIncome)}</p>
            <p className="mt-1 text-xs text-[var(--gfx-faint)]">
              Income − spending so far this month. Adjust spending in the{' '}
              <button type="button" className="text-[var(--gfx-accent)] underline-offset-2 hover:underline" onClick={() => onNavigate('expenses')}>
                Expenses view
              </button>
              .
            </p>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <Card title="Verdict" subtitle="Deterministic guardrail — guidance, not a rule">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={verdictTone}>{plan.monthsNeeded === null ? 'Set a contribution' : plan.gap <= 0 ? 'Affordable now' : `${plan.monthsNeeded} month${plan.monthsNeeded === 1 ? '' : 's'} to save`}</Badge>
              <p className="text-sm text-[var(--gfx-muted)]">{plan.verdict}</p>
            </div>
            {plan.gap > 0 && plan.monthsNeeded !== null && (
              <div className="mt-4">
                <ProgressBar
                  value={plan.shareOfFreeIncome ?? 1}
                  tone={verdictTone === 'danger' ? 'danger' : verdictTone === 'warn' ? 'warn' : 'accent'}
                  label={`Monthly contribution vs free income (${formatCurrency(freeIncome, { compact: true })})`}
                />
              </div>
            )}
            {projection && projection.length > 2 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">
                  Path to {formatCurrency(price, { compact: true })}
                </p>
                <ProjectionLine points={projection} tone="accent" />
              </div>
            )}
            <p className="mt-4 text-xs text-[var(--gfx-faint)]">
              {plan.gap > 0
                ? `Gap to close: ${formatCurrency(plan.gap)}. ${plan.monthsNeeded !== null ? `${formatCurrency(monthlySaving)} per month for ${plan.monthsNeeded} months.` : ''}`
                : 'You already have enough saved for this purchase.'}
            </p>
          </Card>

          <Card title="Where the money could come from" subtitle="Ranked options — you choose">
            {sources.length === 0 ? (
              <p className="text-sm text-[var(--gfx-muted)]">
                No obvious sources right now. Cutting spending or moving a deadline are also valid levers.
              </p>
            ) : (
              <ul className="space-y-3">
                {sources.slice(0, 4).map((source) => {
                  const covers = monthlySaving > 0 && source.monthly >= monthlySaving
                  return (
                    <li key={source.label} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--gfx-text)]">{source.label}</p>
                        <p className="text-xs text-[var(--gfx-faint)]">{source.note}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="tabular text-sm text-[var(--gfx-accent)]">+{formatCurrency(source.monthly, { compact: true })}/mo</span>
                        <Button variant="secondary" size="sm" onClick={() => onNavigate(source.route.replace('/', ''))}>
                          Review
                        </Button>
                        {covers && <Badge tone="accent">Covers it</Badge>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {goals.length > 0 && (
            <Alert tone="info" title="Goal interaction check">
              {goals.map((goal) => `${goal.name}: ${formatCurrency(goal.saved, { compact: true })} of ${formatCurrency(goal.target, { compact: true })}`).join(' · ')}
              . If this purchase delays a goal, moving its deadline is a legitimate choice — make it consciously.
            </Alert>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Disclaimer>
          This tool runs deterministic arithmetic on your entries. A "fits" verdict means the monthly
          contribution stays within your free monthly income — it is a conservative guide, not
          permission, and not financial advice.
        </Disclaimer>
      </div>
    </div>
  )
}

function normalize(sub) {
  if (sub.billingCycle === 'yearly') return roundMoney(sub.amount / 12)
  if (sub.billingCycle === 'quarterly') return roundMoney(sub.amount / 3)
  return roundMoney(sub.amount)
}
