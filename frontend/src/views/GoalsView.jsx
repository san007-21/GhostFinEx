import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Modal, { ConfirmDialog } from '../components/ui/Modal.jsx'
import { Badge, Button, Disclaimer, EmptyState, NumberField, ProgressBar, TextField } from '../components/ui/Primitives.jsx'
import { formatCurrency, formatDate, formatPercent } from '../lib/format'
import { goalStats, roundMoney } from '../lib/finance'
import { IconTarget } from '../components/ui/icons.jsx'

const EMPTY_GOAL = { name: '', target: 0, saved: 0, targetDate: '', note: '' }

export default function GoalsView({ finance }) {
  const { goals, overview, updateGoal, addToGoal, removeGoal, addGoal } = finance
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_GOAL)
  const [formError, setFormError] = useState('')
  const [depositGoal, setDepositGoal] = useState(null)
  const [depositAmount, setDepositAmount] = useState(0)
  const [pendingDelete, setPendingDelete] = useState(null)

  const submitCreate = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return setFormError('Give the goal a name.')
    if (form.target <= 0) return setFormError('Target amount must be greater than zero.')
    if (!form.targetDate) return setFormError('Pick a target date.')
    addGoal({ name, target: form.target, saved: roundMoney(form.saved), targetDate: form.targetDate, note: form.note.trim() })
    setForm(EMPTY_GOAL)
    setFormError('')
    setCreateOpen(false)
  }

  const submitDeposit = () => {
    if (!depositGoal || depositAmount <= 0) return
    addToGoal(depositGoal.id, depositAmount)
    setDepositGoal(null)
    setDepositAmount(0)
  }

  const openCreateModal = () => {
    setForm(EMPTY_GOAL)
    setFormError('')
    setCreateOpen(true)
  }

  if (goals.length === 0) {
    return (
      <div>
        <PageHeader title="Savings goals" subtitle="A goal needs a target and a date — the weekly number follows from the math." />
        <EmptyState
          icon={IconTarget}
          title="No goals yet"
          description="Name something worth saving for — a laptop, a trip home, a safety buffer. GhostFinEx works out the honest weekly number for you."
          action={<Button onClick={openCreateModal}>Create your first goal</Button>}
        />
        <GoalModal open={createOpen} onClose={() => setCreateOpen(false)} form={form} setForm={setForm} formError={formError} onSubmit={submitCreate} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Savings goals"
        subtitle="Progress, remaining amount, and percentage completed — recalculated from your entries."
      >
        <Button onClick={openCreateModal}>+ New goal</Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map((goal) => {
          const stats = goalStats(goal)
          return (
            <Card
              key={goal.id}
              as="article"
              title={goal.name}
              subtitle={goal.note || undefined}
              actions={
                <Badge tone={stats.isComplete ? 'accent' : 'neutral'}>
                  {stats.isComplete ? 'Target reached' : `${formatPercent(stats.percent / 100)} funded`}
                </Badge>
              }
            >
              <ProgressBar value={stats.percent / 100} tone={stats.isComplete ? 'accent' : stats.percent < 30 ? 'warn' : 'info'} label="Progress" />
              <dl className="tabular mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
                  <dt className="text-xs text-[var(--gfx-faint)]">Saved</dt>
                  <dd className="mt-0.5 font-semibold text-[var(--gfx-text)]">{formatCurrency(goal.saved, { compact: true })}</dd>
                </div>
                <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
                  <dt className="text-xs text-[var(--gfx-faint)]">Remaining</dt>
                  <dd className="mt-0.5 font-semibold text-[var(--gfx-text)]">{formatCurrency(stats.remaining, { compact: true })}</dd>
                </div>
                <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
                  <dt className="text-xs text-[var(--gfx-faint)]">Complete</dt>
                  <dd className={`mt-0.5 font-semibold ${stats.isComplete ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-text)]'}`}>{stats.percent}%</dd>
                </div>
              </dl>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <NumberField label="Target (R)" value={goal.target} onChange={(v) => updateGoal(goal.id, { target: v })} step={100} prefix="R" />
                <NumberField label="Saved so far (R)" value={goal.saved} onChange={(v) => updateGoal(goal.id, { saved: v })} step={50} prefix="R" />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Target date</span>
                  <input type="date" className="date-input" value={goal.targetDate} onChange={(e) => updateGoal(goal.id, { targetDate: e.target.value })} />
                </label>
                <div className="tabular rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
                  <p className="text-xs text-[var(--gfx-faint)]">Weekly amount needed</p>
                  <p className={`text-lg font-semibold ${stats.isComplete ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-text)]'}`}>
                    {stats.isComplete ? 'On track' : formatCurrency(stats.weeklyNeeded)}
                  </p>
                  <p className="text-xs text-[var(--gfx-faint)]">{stats.weeksLeft} weeks left · due {formatDate(goal.targetDate)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--gfx-border)] pt-3">
                <Button size="sm" onClick={() => { setDepositGoal(goal); setDepositAmount(0) }}>
                  Add deposit
                </Button>
                <Button variant="danger" size="sm" onClick={() => setPendingDelete(goal)}>
                  Remove
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      <Card title="Savings capacity" subtitle="How your goals compare with this month's capacity" className="mt-6">
        <p className="text-sm text-[var(--gfx-muted)]">
          Cash left after spending this month:{' '}
          <strong className={`tabular ${overview.savingsThisMonth >= 0 ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-danger)]'}`}>
            {formatCurrency(overview.savingsThisMonth, { compact: true })}
          </strong>
          . Leftover cash is potential savings — record it in the Savings view to make it real. If deposits
          exceed that number, you are planning to save more than the month allows — the What-if view can test the trade-off.
        </p>
      </Card>

      <GoalModal open={createOpen} onClose={() => setCreateOpen(false)} form={form} setForm={setForm} formError={formError} onSubmit={submitCreate} />

      <Modal
        open={depositGoal !== null}
        onClose={() => setDepositGoal(null)}
        title={`Add deposit — ${depositGoal?.name ?? ''}`}        footer={
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
        onConfirm={() => removeGoal(pendingDelete.id)}
        title="Remove goal?"
        confirmLabel="Remove goal"
        danger
      >
        <p className="text-sm text-[var(--gfx-muted)]">
          "{pendingDelete?.name}" and its {formatCurrency(pendingDelete?.saved ?? 0, { compact: true })} of recorded savings will be removed. This cannot be undone.
        </p>
      </ConfirmDialog>

      <div className="mt-6">
        <Disclaimer>
          The weekly number is arithmetic, not judgment: the remaining gap divided by the weeks left.
          If it feels impossible, move the date — GhostFinEx will never shame you for it.
        </Disclaimer>
      </div>
    </div>
  )
}

function GoalModal({ open, onClose, form, setForm, formError, onSubmit }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New savings goal"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit}>Create goal</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField label="Goal name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Study tour" />
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label="Target amount (R)" value={form.target} onChange={(v) => setForm((f) => ({ ...f, target: v }))} step={100} prefix="R" />
          <NumberField label="Already saved (R)" value={form.saved} onChange={(v) => setForm((f) => ({ ...f, saved: v }))} step={50} prefix="R" />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Target date</span>
          <input type="date" className="date-input" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} />
        </label>
        <TextField label="Note (optional)" value={form.note} onChange={(v) => setForm((f) => ({ ...f, note: v }))} placeholder="Why this matters" />
        {formError && <p role="alert" className="text-sm text-[var(--gfx-danger)]">{formError}</p>}
        <button type="submit" className="sr-only">Create</button>
      </form>
    </Modal>
  )
}
