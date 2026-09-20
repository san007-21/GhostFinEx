import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Modal, { ConfirmDialog } from '../components/ui/Modal.jsx'
import { Badge, Button, Disclaimer, EmptyState, NumberField, ProgressBar, TextField } from '../components/ui/Primitives.jsx'
import { formatCurrency, formatDate, formatPercent } from '../lib/format'
import { progressToward, weeklyAmountNeeded, weeksUntil } from '../lib/finance'
import { IconTarget } from '../components/ui/icons.jsx'

const EMPTY_GOAL = { name: '', target: 0, saved: 0, deadline: '', note: '' }

export default function GoalsView({ finance }) {
  const { goals, updateGoal, addToGoal, removeGoal, addGoal } = finance
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_GOAL)
  const [depositGoal, setDepositGoal] = useState(null)
  const [depositAmount, setDepositAmount] = useState(0)
  const [pendingDelete, setPendingDelete] = useState(null)

  const submitCreate = (event) => {
    event.preventDefault()
    if (!form.name.trim() || form.target <= 0 || !form.deadline) return
    addGoal({ name: form.name.trim(), target: form.target, saved: form.saved, deadline: form.deadline, note: form.note.trim() })
    setForm(EMPTY_GOAL)
    setCreateOpen(false)
  }

  const submitDeposit = () => {
    if (!depositGoal || depositAmount <= 0) return
    addToGoal(depositGoal.id, depositAmount)
    setDepositGoal(null)
    setDepositAmount(0)
  }

  if (goals.length === 0) {
    return (
      <div>
        <PageHeader title="Savings goals" subtitle="A goal needs a target and a date — the weekly number follows from the math." />
        <EmptyState
          icon={IconTarget}
          title="No goals yet"
          description="Name something worth saving for — a laptop, a trip home, a safety buffer. GhostFinEx works out the honest weekly number for you."
          action={<Button onClick={() => setCreateOpen(true)}>Create your first goal</Button>}
        />
        <CreateGoalModal open={createOpen} onClose={() => setCreateOpen(false)} form={form} setForm={setForm} onSubmit={submitCreate} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Savings goals"
        subtitle="A goal needs a target and a date — the weekly number follows from the math."
      >
        <Button onClick={() => setCreateOpen(true)}>+ New goal</Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map((goal) => {
          const weeks = weeksUntil(goal.deadline)
          const weeklyNeed = weeklyAmountNeeded(goal.target, goal.saved, weeks)
          const progress = progressToward(goal.saved, goal.target)
          const complete = goal.saved >= goal.target
          return (
            <Card
              key={goal.id}
              as="article"
              title={goal.name}
              subtitle={goal.note || undefined}
              actions={
                <Badge tone={complete ? 'accent' : 'neutral'}>
                  {complete ? 'Target reached' : `${formatPercent(progress)} funded`}
                </Badge>
              }
            >
              <ProgressBar value={progress} tone={complete ? 'accent' : progress < 0.3 ? 'warn' : 'info'} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <NumberField label="Target (R)" value={goal.target} onChange={(v) => updateGoal(goal.id, { target: v })} step={100} />
                <NumberField label="Saved so far (R)" value={goal.saved} onChange={(v) => updateGoal(goal.id, { saved: v })} step={50} />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Deadline</span>
                  <input type="date" className="date-input" value={goal.deadline} onChange={(e) => updateGoal(goal.id, { deadline: e.target.value })} />
                </label>
                <div className="tabular rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
                  <p className="text-xs text-[var(--gfx-faint)]">Weekly amount needed</p>
                  <p className={`text-lg font-semibold ${complete ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-text)]'}`}>
                    {weeklyNeed === 0 ? 'On track' : formatCurrency(weeklyNeed)}
                  </p>
                  <p className="text-xs text-[var(--gfx-faint)]">{weeks} weeks left · due {formatDate(goal.deadline)}</p>
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

      <CreateGoalModal open={createOpen} onClose={() => setCreateOpen(false)} form={form} setForm={setForm} onSubmit={submitCreate} />

      {/* Deposit modal */}
      <Modal
        open={depositGoal !== null}
        onClose={() => setDepositGoal(null)}
        title={`Add deposit — ${depositGoal?.name ?? ''}`}
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

function CreateGoalModal({ open, onClose, form, setForm, onSubmit }) {
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
          <NumberField label="Target (R)" value={form.target} onChange={(v) => setForm((f) => ({ ...f, target: v }))} step={100} prefix="R" />
          <NumberField label="Already saved (R)" value={form.saved} onChange={(v) => setForm((f) => ({ ...f, saved: v }))} step={50} prefix="R" />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Deadline</span>
          <input type="date" className="date-input" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
        </label>
        <TextField label="Note (optional)" value={form.note} onChange={(v) => setForm((f) => ({ ...f, note: v }))} placeholder="Why this matters" />
        <button type="submit" className="sr-only">Create</button>
      </form>
    </Modal>
  )
}
