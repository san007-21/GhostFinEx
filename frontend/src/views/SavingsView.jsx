import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Modal, { ConfirmDialog } from '../components/ui/Modal.jsx'
import { Alert, Badge, Button, Disclaimer, EmptyState, NumberField, ProgressBar, SelectField, StatCard, TextField } from '../components/ui/Primitives.jsx'
import { formatCurrency, formatDate } from '../lib/format'
import { goalStats } from '../lib/finance'
import { IconTarget } from '../components/ui/icons.jsx'

const EMPTY_CONTRIBUTION = { amount: 0, date: '', destination: '', label: '' }

/**
 * Savings — explicit contributions and the goals they fund. Leftover cash
 * (income − expenses) is shown as potential savings only; it never counts
 * as saved until the user records a real contribution.
 */
export default function SavingsView({ finance }) {
  const { savings, goals, profile, recordSavings, addToGoal, removeGoal, updateGoal } = finance

  const [recordOpen, setRecordOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_CONTRIBUTION)
  const [formError, setFormError] = useState('')
  const [depositGoal, setDepositGoal] = useState(null)
  const [depositAmount, setDepositAmount] = useState(0)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteMode, setDeleteMode] = useState('goal')

  const openRecordModal = () => {
    setForm(EMPTY_CONTRIBUTION)
    setFormError('')
    setRecordOpen(true)
  }

  const recent = useMemo(
    () => [...finance.savingsContributions].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8),
    [finance.savingsContributions],
  )

  const goalOptions = [
    { value: '', label: 'General savings (no specific goal)' },
    ...goals.map((goal) => ({ value: `goal-${goal.id}`, label: goal.name })),
  ]

  const submitRecord = (event) => {
    event.preventDefault()
    if (form.amount <= 0) return setFormError('Amount must be greater than zero.')
    if (!form.date) return setFormError('Pick the date you moved the money.')
    recordSavings({ amount: form.amount, date: form.date, destination: form.destination, label: form.label })
    setForm(EMPTY_CONTRIBUTION)
    setFormError('')
    setRecordOpen(false)
  }

  const submitDeposit = () => {
    if (!depositGoal || depositAmount <= 0) return
    addToGoal(depositGoal.id, depositAmount)
    setDepositGoal(null)
    setDepositAmount(0)
  }

  return (
    <div>
      <PageHeader
        title="Savings"
        subtitle="Money you actually moved into savings — kept separate from whatever is simply left over."
      >
        <Button onClick={openRecordModal}>+ Record contribution</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Saved this month" value={formatCurrency(savings.contributionsThisMonth, { compact: true })} sub="recorded contributions" tone="accent" />
        <StatCard label="Total saved (goals)" value={formatCurrency(savings.totalSaved, { compact: true })} sub="across all goals" />
        <StatCard
          label="Left over this month"
          value={formatCurrency(savings.leftoverCash, { compact: true })}
          sub="income − expenses — not savings yet"
          tone={savings.leftoverCash >= 0 ? 'default' : 'danger'}
        />
        <StatCard label="Plan capacity" value={formatCurrency(finance.net, { compact: true })} sub="income − budget" tone="info" />
      </div>

      <div className="mb-6">
        <Alert tone="info" title="Leftover cash is not savings — yet">
          {formatCurrency(Math.max(0, savings.leftoverCash), { compact: true })} of your income is unspent this month. Until you record it as a
          contribution below, it is simply money still available to spend — GhostFinEx will not count it as saved on your behalf.
        </Alert>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Recent contributions" subtitle="Explicit transfers into savings" className="lg:col-span-2">
          {recent.length === 0 ? (
            <EmptyState
              icon={IconTarget}
              title="No contributions recorded"
              description="Recording a contribution moves real money into a goal — the goal's saved amount updates with it."
              action={<Button onClick={openRecordModal}>+ Record contribution</Button>}
            />
          ) : (
            <ul className="divide-y divide-[var(--gfx-border)]/60">
              {recent.map((entry) => {
                const goal = goals.find((g) => `goal-${g.id}` === entry.destination)
                return (
                  <li key={entry.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--gfx-text)]">{entry.label}</p>
                      <p className="text-xs text-[var(--gfx-faint)]">
                        {formatDate(entry.date)} · {goal ? `→ ${goal.name}` : 'General savings'}
                      </p>
                    </div>
                    <span className="tabular text-sm font-medium text-[var(--gfx-accent)]">+{formatCurrency(entry.amount)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="Goals" subtitle="What your savings are building toward">
          {goals.length === 0 ? (
            <EmptyState icon={IconTarget} title="No goals yet" description="Create a goal to give your contributions a destination." />
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const stats = goalStats(goal)
                return (
                  <div key={goal.id} className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-[var(--gfx-text)]">{goal.name}</p>
                      <Badge tone={stats.isComplete ? 'accent' : 'neutral'}>{stats.percent}%</Badge>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={stats.percent / 100} tone={stats.isComplete ? 'accent' : 'info'} />
                    </div>
                    <p className="tabular mt-2 text-xs text-[var(--gfx-faint)]">
                      {formatCurrency(goal.saved, { compact: true })} of {formatCurrency(goal.target, { compact: true })} ·{' '}
                      {formatCurrency(stats.remaining, { compact: true })} to go
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => { setDepositGoal(goal); setDepositAmount(0) }}>Deposit</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDeleteMode('goal'); setPendingDelete(goal) }}>Remove</Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Card title="Contribution planning" subtitle="Required amounts per goal" className="mt-6">
        {goals.length === 0 ? (
          <p className="text-sm text-[var(--gfx-muted)]">No goals yet — required contributions appear once goals exist.</p>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const stats = goalStats(goal)
              return (
                <div key={goal.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gfx-border)]/60 pb-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--gfx-text)]">{goal.name}</p>
                    <p className="text-xs text-[var(--gfx-faint)]">
                      due {formatDate(goal.targetDate)} · {stats.weeksLeft} weeks left
                    </p>
                  </div>
                  <div className="tabular text-sm">
                    <span className="text-[var(--gfx-muted)]">Needed: </span>
                    <strong className={stats.isComplete ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-text)]'}>
                      {stats.isComplete ? 'Done' : `${formatCurrency(stats.weeklyNeeded)}/week`}
                    </strong>
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-[var(--gfx-faint)]">
              Contributions recorded this month: {formatCurrency(savings.contributionsThisMonth)} · plan capacity (income − budget):
              {' '}<span className="tabular">{formatCurrency(finance.net)}</span> · income {formatCurrency(profile.monthlyIncome, { compact: true })}.
            </p>
          </div>
        )}
      </Card>

      {/* Record-contribution modal */}
      <Modal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Record a savings contribution"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRecordOpen(false)}>Cancel</Button>
            <Button onClick={submitRecord} disabled={form.amount <= 0}>Save contribution</Button>
          </>
        }
      >
        <form onSubmit={submitRecord} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Amount (R)" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} step={50} prefix="R" />
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Date</span>
              <input type="date" className="date-input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </label>
          </div>
          <SelectField label="Destination" value={form.destination} onChange={(v) => setForm((f) => ({ ...f, destination: v }))} options={goalOptions} />
          <TextField label="Label (optional)" value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))} placeholder="e.g. Monthly top-up" />
          {formError && <p role="alert" className="text-sm text-[var(--gfx-danger)]">{formError}</p>}
          <button type="submit" className="sr-only">Save</button>
        </form>
      </Modal>

      {/* Quick deposit to a specific goal */}
      <Modal
        open={depositGoal !== null}
        onClose={() => setDepositGoal(null)}
        title={`Deposit — ${depositGoal?.name ?? ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDepositGoal(null)}>Cancel</Button>
            <Button onClick={submitDeposit} disabled={depositAmount <= 0}>Add to goal</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--gfx-muted)]">
          {depositGoal && (
            <>
              {formatCurrency(depositGoal.saved, { compact: true })} saved of {formatCurrency(depositGoal.target, { compact: true })} —{' '}
              {formatCurrency(Math.max(0, depositGoal.target - depositGoal.saved), { compact: true })} to go.
            </>
          )}
        </p>
        <NumberField label="Deposit amount (R)" value={depositAmount} onChange={setDepositAmount} step={50} prefix="R" />
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => (deleteMode === 'goal' ? removeGoal(pendingDelete.id) : updateGoal(pendingDelete.id, { saved: 0 }))}
        title={deleteMode === 'goal' ? 'Remove goal?' : 'Reset saved amount?'}
        confirmLabel={deleteMode === 'goal' ? 'Remove goal' : 'Reset'}
        danger
      >
        <p className="text-sm text-[var(--gfx-muted)]">
          {deleteMode === 'goal'
            ? `"${pendingDelete?.name}" and its recorded savings will be removed. This cannot be undone.`
            : `The saved amount on "${pendingDelete?.name}" will reset to zero. Contributions history keeps its records.`}
        </p>
      </ConfirmDialog>

      <div className="mt-6">
        <Disclaimer>
          Savings here means money you explicitly moved — not income minus expenses. The leftover figure
          is shown for awareness only, and the decision to save it is always yours.
        </Disclaimer>
      </div>
    </div>
  )
}
