import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Alert, Button, Disclaimer, StatCard } from '../components/ui/Primitives.jsx'
import { ProjectionLine } from '../components/charts/Charts.jsx'
import { formatCurrency } from '../lib/format'
import { applyScenario, monthlyNet, projectBalance, roundMoney, sumBudget } from '../lib/finance'

/**
 * What-if simulation. Fully deterministic: sliders multiply planned category
 * amounts; every result is recomputed with the same finance functions used
 * everywhere else. Nothing is saved — this view is a sandbox.
 */
const PRESETS = [
  { id: 'reset', label: 'Back to plan', factors: {} },
  { id: 'lean', label: 'Lean month', factors: { 'Social & entertainment': 0.6, 'Groceries': 0.9 } },
  { id: 'frugal', label: 'Exam sprint', factors: { 'Social & entertainment': 0.4, 'Groceries': 0.85, 'Transport': 0.9 } },
]

export default function WhatIfView({ finance }) {
  const { budgetLines, profile, goals } = finance
  const [factors, setFactors] = useState({})

  const baseline = useMemo(() => sumBudget(budgetLines), [budgetLines])
  const scenario = useMemo(() => applyScenario(budgetLines, factors), [budgetLines, factors])
  const scenarioTotals = useMemo(() => sumBudget(scenario), [scenario])

  const baselineNet = monthlyNet(profile.monthlyIncome, baseline.planned)
  const scenarioNet = monthlyNet(profile.monthlyIncome, scenarioTotals.planned)

  const startBalance = roundMoney(profile.monthlyIncome - baseline.spent)
  const baselinePath = useMemo(() => projectBalance(Math.max(startBalance, 0), baselineNet, 6), [startBalance, baselineNet])
  const scenarioPath = useMemo(() => projectBalance(Math.max(startBalance, 0), scenarioNet, 6), [startBalance, scenarioNet])

  const savingVsBaseline = roundMoney(baselineNet - scenarioNet)

  const setFactor = (category, value) =>
    setFactors((prev) => {
      const next = { ...prev }
      if (value === 1) delete next[category]
      else next[category] = value
      return next
    })

  return (
    <div>
      <PageHeader
        title="What-if simulation"
        subtitle="Move the sliders and watch the month re-plan itself. Nothing is saved — this is a sandbox."
      >
        {Object.keys(factors).length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => setFactors({})}>
            Reset scenario
          </Button>
        )}
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setFactors({ ...preset.factors })}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              JSON.stringify(factors) === JSON.stringify(preset.factors)
                ? 'border-[rgba(52,211,153,0.4)] bg-[var(--gfx-accent-soft)] text-[var(--gfx-accent)]'
                : 'border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] text-[var(--gfx-muted)] hover:text-[var(--gfx-text)]'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Planned spending" value={formatCurrency(scenarioTotals.planned, { compact: true })} sub={`Baseline ${formatCurrency(baseline.planned, { compact: true })}`} tone={scenarioTotals.planned < baseline.planned ? 'accent' : 'default'} />
        <StatCard label="End-of-month money" value={formatCurrency(scenarioNet, { compact: true })} sub={`Baseline ${formatCurrency(baselineNet, { compact: true })}`} tone={scenarioNet >= baselineNet ? 'accent' : 'danger'} />
        <StatCard label="Monthly difference" value={`${savingVsBaseline >= 0 ? '+' : '−'}${formatCurrency(Math.abs(savingVsBaseline), { compact: true })}`} sub="vs your current plan" tone={savingVsBaseline >= 0 ? 'accent' : 'warn'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Adjust categories" subtitle="Each slider scales the planned amount; 100% means unchanged">
          <div className="space-y-5">
            {budgetLines.map((line) => {
              const factor = factors[line.category] ?? 1
              const newPlanned = roundMoney(line.planned * factor)
              const changed = newPlanned !== line.planned
              return (
                <div key={line.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-[var(--gfx-text)]">{line.category}</span>
                    <span className="tabular text-[var(--gfx-muted)]">
                      {changed && <span className="mr-2 text-[var(--gfx-faint)] line-through">{formatCurrency(line.planned, { compact: true })}</span>}
                      <strong className={changed ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-text)]'}>{formatCurrency(newPlanned, { compact: true })}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={150}
                      step={5}
                      value={Math.round(factor * 100)}
                      aria-label={`Scale planned amount for ${line.category}`}
                      onChange={(e) => setFactor(line.category, Number(e.target.value) / 100)}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--gfx-surface-3)] accent-[var(--gfx-accent-strong)]"
                    />
                    <span className="tabular w-12 shrink-0 text-right text-xs text-[var(--gfx-faint)]">{Math.round(factor * 100)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="6-month projection" subtitle="Starting from money left this month, applying this plan each month">
            <div className="relative">
              <ProjectionLine points={scenarioPath} tone="accent" />
              <div className="pointer-events-none absolute inset-0">
                <ProjectionLine points={baselinePath} tone="info" />
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[var(--gfx-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--gfx-accent-strong)]" /> Scenario
              </span>
              <span className="flex items-center gap-1.5 text-[var(--gfx-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--gfx-info)]" /> Current plan
              </span>
            </div>
            <p className="mt-3 text-xs text-[var(--gfx-faint)]">
              Projection assumes the same net amount every month. It is a straight-line sketch to
              compare trajectories, not a forecast.
            </p>
          </Card>

          <Card title="Scenario summary" subtitle="What changes, plainly stated">
            <ul className="space-y-2.5 text-sm text-[var(--gfx-muted)]">
              <li className="flex gap-2">
                <span className="text-[var(--gfx-accent)]">•</span>
                <span>
                  Planned spending goes from <strong className="text-[var(--gfx-text)]">{formatCurrency(baseline.planned)}</strong> to{' '}
                  <strong className="text-[var(--gfx-text)]">{formatCurrency(scenarioTotals.planned)}</strong>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--gfx-accent)]">•</span>
                <span>
                  {savingVsBaseline >= 0
                    ? <>That frees <strong className="text-[var(--gfx-accent)]">{formatCurrency(savingVsBaseline)}</strong> per month — {formatCurrency(roundMoney(savingVsBaseline * 12), { compact: true })} over a year.</>
                    : <>That spends an extra <strong className="text-[var(--gfx-warn)]">{formatCurrency(Math.abs(savingVsBaseline))}</strong> per month.</>}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--gfx-accent)]">•</span>
                <span>
                  {goals.length > 0
                    ? `At this rate, ${goals[0].name} gains ${formatCurrency(roundMoney(Math.max(savingVsBaseline, 0) * 4.33), { compact: true })} per month if redirected there.`
                    : 'Create a goal to see what this saving could fund.'}
                </span>
              </li>
            </ul>
            {scenarioNet < 0 && (
              <div className="mt-4">
                <Alert tone="danger" title="This plan runs a monthly deficit">
                  Planned spending exceeds income by {formatCurrency(Math.abs(scenarioNet), { compact: true })} — the projection will trend below zero.
                </Alert>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Disclaimer>
          Simulations are deterministic recomputations of your own plan. They show consequences of
          choices — the choice itself stays yours, and nothing here is financial advice.
        </Disclaimer>
      </div>
    </div>
  )
}
