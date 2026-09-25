import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Alert, Badge, Disclaimer, NumberField, TextField } from '../components/ui/Primitives.jsx'
import { formatCurrency, formatPercent } from '../lib/format'
import { affordabilityAnalysis, roundMoney } from '../lib/finance'
import { takePriceSuggestion } from '../lib/priceHandoff'

export default function AffordView({ finance, onNavigate }) {
  const { profile, overview } = finance

  // Consume a web-price handoff once at mount (from Smart Shopping / Ghost):
  // prefill only — the calculation below always recomputes deterministically
  // from whatever the user finally submits. Views remount on navigation
  // (App keys <main> by view id), so mount time is exactly the right moment.
  const [suggestion] = useState(() => takePriceSuggestion())
  const [name, setName] = useState(suggestion?.label || '')
  const [price, setPrice] = useState(suggestion?.price ?? 0)
  const [webSource] = useState(() =>
    suggestion ? { domain: suggestion.sourceDomain, url: suggestion.sourceUrl } : null,
  )

  const analysis = useMemo(
    () =>
      affordabilityAnalysis({
        price,
        availableBalance: profile.availableBalance,
        monthlyBudget: profile.monthlyBudget,
        monthlyIncome: profile.monthlyIncome,
      }),
    [price, profile],
  )

  const tone = price <= 0 ? 'info' : analysis.fitsNow ? (analysis.shareOfBalance > 0.5 ? 'warn' : 'accent') : 'danger'

  const verdict = (() => {
    if (price <= 0) return 'Enter a price to run the numbers.'
    if (analysis.fitsNow) {
      const share = formatPercent(analysis.shareOfBalance)
      const balancePart = `Your balance of ${formatCurrency(profile.availableBalance)} covers the ${formatCurrency(price)} price, leaving ${formatCurrency(analysis.remainingAfterPurchase)}. That is ${share} of your balance.`
      let budgetPart
      if (analysis.budgetImpact.remainingAfter < 0) {
        budgetPart = ` It would consume more than your entire ${formatCurrency(profile.monthlyBudget)} monthly budget, so other planned spending would need to move.`
      } else if (analysis.budgetImpact.priceShare > 0.5) {
        budgetPart = ` It takes ${formatPercent(analysis.budgetImpact.priceShare)} of your monthly budget — possible, but it squeezes everything else.`
      } else {
        budgetPart = ` It takes ${formatPercent(analysis.budgetImpact.priceShare)} of your monthly budget, leaving ${formatCurrency(analysis.budgetImpact.remainingAfter)} planned.`
      }
      let savingsPart
      if (analysis.monthsOfSaving !== null && analysis.monthsOfSaving > 0) {
        savingsPart = ` Measured against your plan capacity of ${formatCurrency(analysis.savingCapacity)}/month (income − budget), this price equals ${analysis.monthsOfSaving === 1 ? 'one month' : `${analysis.monthsOfSaving} months`} of not-spending.`
      } else {
        savingsPart = ' Your current plan has no monthly saving capacity, so this would come entirely from existing balance.'
      }
      return balancePart + budgetPart + savingsPart
    }
    const shortfall = formatCurrency(Math.abs(analysis.remainingAfterPurchase))
    const months = analysis.monthsOfSaving
    return `Your balance does not cover this yet — you are ${shortfall} short. Measured against your plan capacity of ${formatCurrency(analysis.savingCapacity)}/month (income − budget), you would need about ${months ?? 'more'} ${months === 1 ? 'month' : 'months'} of it. The Goals and What-if views can help you plan it.`
  })()

  return (
    <div>
      <PageHeader
        title="Can I afford this?"
        subtitle="Run the numbers on a purchase before you make it — no judgment, just arithmetic."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="The purchase" subtitle="What is it, and what does it cost?" className="lg:col-span-2">
          <div className="space-y-4">
            <TextField label="Item name (optional)" value={name} onChange={setName} placeholder="e.g. Refurbished laptop" />
            <NumberField label="Price (R)" value={price} onChange={setPrice} step={100} prefix="R" />
          </div>
          {webSource && (
            <p className="text-xs text-[var(--gfx-info)]">
              Prefilled from current web research{webSource.domain ? ` (${webSource.domain})` : ''} — adjust the price if the source was outdated.
            </p>
          )}
          <div className="mt-5 rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
            <p className="text-xs text-[var(--gfx-faint)]">Current available balance</p>
            <p className="tabular text-xl font-semibold text-[var(--gfx-text)]">{formatCurrency(profile.availableBalance)}</p>
            <p className="mt-1 text-xs text-[var(--gfx-faint)]">
              Edit it in the{' '}
              <button type="button" className="text-[var(--gfx-accent)] underline-offset-2 hover:underline" onClick={() => onNavigate('overview')}>
                Financial overview
              </button>
              . Monthly budget: {formatCurrency(profile.monthlyBudget, { compact: true })}.
            </p>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <Card title="Result" subtitle="Deterministic arithmetic on your real numbers — not advice">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={tone}>
                {price <= 0 ? 'Waiting for input' : analysis.fitsNow ? 'Fits your balance' : 'Not covered by balance'}
              </Badge>
              {price > 0 && analysis.fitsNow && analysis.budgetImpact.priceShare > 0.5 && (
                <Badge tone="warn">Squeezes the budget</Badge>
              )}
            </div>
            <div className="tabular mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-3">
                <p className="text-xs text-[var(--gfx-faint)]">Item price</p>
                <p className="text-lg font-semibold text-[var(--gfx-text)]">{formatCurrency(analysis.price, { compact: true })}</p>
              </div>
              <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-3">
                <p className="text-xs text-[var(--gfx-faint)]">Balance after purchase</p>
                <p className={`text-lg font-semibold ${analysis.remainingAfterPurchase < 0 ? 'text-[var(--gfx-danger)]' : 'text-[var(--gfx-accent)]'}`}>
                  {formatCurrency(analysis.remainingAfterPurchase, { compact: true })}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-3">
                <p className="text-xs text-[var(--gfx-faint)]">Budget after purchase</p>
                <p className={`text-lg font-semibold ${analysis.budgetImpact.remainingAfter < 0 ? 'text-[var(--gfx-danger)]' : 'text-[var(--gfx-text)]'}`}>
                  {formatCurrency(analysis.budgetImpact.remainingAfter, { compact: true })}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--gfx-muted)]">{verdict}</p>
          </Card>          {price > 0 && !analysis.fitsNow && overview.savingsThisMonth > 0 && (
            <Alert tone="info" title="A savings plan could close the gap">
              You are {formatCurrency(Math.abs(analysis.remainingAfterPurchase), { compact: true })} short. If you saved your full{' '}
              {formatCurrency(overview.savingsThisMonth, { compact: true })} of unspent income this month toward it, the gap would
              close — see the{' '}
              <button type="button" className="font-medium text-[var(--gfx-accent)] underline-offset-2 hover:underline" onClick={() => onNavigate('goals')}>
                Goals view
              </button>{' '}
              to plan it properly.
            </Alert>
          )}

          <Card title="How this is calculated" subtitle="Every formula, in the open">
            <ul className="space-y-2 text-sm text-[var(--gfx-muted)]">
              <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Remaining balance = available balance − item price</li>
              <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Budget impact = monthly budget − item price (what is left for everything else)</li>
              <li className="flex gap-2"><span className="text-[var(--gfx-accent)]">•</span> Savings impact = item price ÷ (monthly income − monthly budget), when positive</li>
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Disclaimer>
          {roundMoney(0) === 0
            ? 'This tool runs deterministic arithmetic on your entries. A "fits" result means the numbers allow it — it is not permission, and nothing here is financial advice. The decision stays yours.'
            : ''}
        </Disclaimer>
      </div>
    </div>
  )
}
