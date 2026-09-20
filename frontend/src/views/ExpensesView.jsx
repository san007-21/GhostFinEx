import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Modal, { ConfirmDialog } from '../components/ui/Modal.jsx'
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  NumberField,
  SelectField,
  StatCard,
  TextField,
} from '../components/ui/Primitives.jsx'
import { CategoryBars } from '../components/charts/Charts.jsx'
import { formatCurrency, formatDate } from '../lib/format'
import { expensesByCategory, expensesInMonth } from '../lib/finance'
import { IconWallet } from '../components/ui/icons.jsx'

const EMPTY_FORM = { date: '', category: '', note: '', amount: 0 }

export default function ExpensesView({ finance }) {
  const { budgetLines, expenses, totals, unallocated, profile, addExpense, updateBudgetLine, addBudgetLine, removeBudgetLine, removeExpense } = finance
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter] = useState('all')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [newCategory, setNewCategory] = useState('')
  const [newPlanned, setNewPlanned] = useState(0)

  const categories = budgetLines.map((line) => line.category)
  const filtered = useMemo(
    () => (filter === 'all' ? expenses : expenses.filter((e) => e.category === filter)),
    [expenses, filter],
  )
  const monthExpenses = useMemo(() => expensesInMonth(expenses), [expenses])
  const categoryData = useMemo(
    () => expensesByCategory(monthExpenses).map((entry) => ({ label: entry.category, value: entry.total })),
    [monthExpenses],
  )

  const submitExpense = (event) => {
    event.preventDefault()
    if (!form.category || form.amount <= 0 || !form.date) return
    addExpense({ date: form.date, category: form.category, note: form.note.trim(), amount: Math.round(form.amount * 100) / 100 })
    setForm(EMPTY_FORM)
    setAddOpen(false)
  }

  const submitCategory = (event) => {
    event.preventDefault()
    if (!newCategory.trim() || newPlanned <= 0) return
    addBudgetLine(newCategory.trim(), newPlanned)
    setNewCategory('')
    setNewPlanned(0)
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Log what you spend, plan categories, and keep the ledger honest."
      >
        <Button onClick={() => setAddOpen(true)}>+ Add expense</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly income" value={formatCurrency(profile.monthlyIncome, { compact: true })} />
        <StatCard label="Planned" value={formatCurrency(totals.planned, { compact: true })} sub={`${budgetLines.length} categories`} />
        <StatCard label="Spent" value={formatCurrency(totals.spent, { compact: true })} sub={`${monthExpenses.length} entries`} />
        <StatCard label="Remaining" value={formatCurrency(profile.monthlyIncome - totals.spent, { compact: true })} tone={profile.monthlyIncome - totals.spent < 0 ? 'danger' : 'accent'} />
      </div>

      {unallocated < 0 && (
        <div className="mb-6">
          <Alert tone="warn" title="Plan exceeds income">
            Planned amounts are {formatCurrency(Math.abs(unallocated), { compact: true })} above monthly income. Trim a category below.
          </Alert>
        </div>
      )}

      <Card
        title="Budget categories"
        subtitle="Edit planned amounts and what you have actually spent"
        className="mb-6"
        actions={<Badge tone={totals.overBudget ? 'danger' : 'accent'}>{Math.round(totals.utilization * 100)}% used</Badge>}
      >
        <div className="space-y-3">
          {budgetLines.map((line) => {
            const over = line.spent > line.planned
            return (
              <div key={line.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-3 transition-colors hover:border-[var(--gfx-border-strong)]">
                <div className="min-w-40 flex-1">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Category</span>
                  <input
                    type="text"
                    aria-label={`Category name for ${line.category}`}
                    className="w-full rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface)] px-3 py-2 text-sm text-[var(--gfx-text)] transition-colors focus:border-[var(--gfx-accent-strong)] focus:outline-none"
                    value={line.category}
                    onChange={(e) => updateBudgetLine(line.id, { category: e.target.value })}
                  />
                </div>
                <NumberField label="Planned" value={line.planned} onChange={(v) => updateBudgetLine(line.id, { planned: v })} step={10} prefix="R" />
                <NumberField label="Spent" value={line.spent} onChange={(v) => updateBudgetLine(line.id, { spent: v })} step={10} prefix="R" hint={over ? 'Over plan' : undefined} />
                <Button variant="danger" size="sm" onClick={() => setPendingDelete(line)} aria-label={`Remove ${line.category}`}>
                  Remove
                </Button>
              </div>
            )
          })}
        </div>

        <form onSubmit={submitCategory} className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--gfx-border)] pt-4">
          <div className="min-w-40 flex-1">
            <TextField label="New category" value={newCategory} onChange={setNewCategory} placeholder="e.g. Laundry" />
          </div>
          <NumberField label="Planned" value={newPlanned} onChange={setNewPlanned} step={10} prefix="R" />
          <Button type="submit">Add category</Button>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Ledger" subtitle={filter === 'all' ? 'All expenses' : `Filtered: ${filter}`} className="lg:col-span-2">
          <div className="mb-4">
            <SelectField
              label="Filter by category"
              value={filter}
              onChange={setFilter}
              options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={IconWallet}
              title="No expenses here yet"
              description="Log your first expense to see it appear instantly in totals, charts, and the calendar."
              action={<Button onClick={() => setAddOpen(true)}>+ Add expense</Button>}
            />
          ) : (
            <ul className="divide-y divide-[var(--gfx-border)]/60">
              {filtered.map((expense) => (
                <li key={expense.id} className="group flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[var(--gfx-text)]">{expense.note || expense.category}</p>
                    <p className="text-xs text-[var(--gfx-faint)]">
                      {formatDate(expense.date)} · {expense.category}
                    </p>
                  </div>
                  <span className="tabular text-sm font-medium text-[var(--gfx-text)]">{formatCurrency(expense.amount)}</span>
                  <Button
                    variant="danger"
                    size="sm"
                    className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                    onClick={() => setPendingDelete(expense)}
                    aria-label={`Delete ${expense.note || expense.category}`}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="By category" subtitle="This month's ledger">
          {categoryData.length === 0 ? (
            <EmptyState icon={IconWallet} title="Nothing logged yet" description="Category totals appear once expenses are recorded." />
          ) : (
            <CategoryBars data={categoryData} />
          )}
        </Card>
      </div>

      {/* Add-expense dialog */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add expense"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitExpense}>Save expense</Button>
          </>
        }
      >
        <form onSubmit={submitExpense} className="space-y-4">
          <TextField label="Note" value={form.note} onChange={(v) => setForm((f) => ({ ...f, note: v }))} placeholder="e.g. Weekly shop" />
          <SelectField
            label="Category"
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            options={[{ value: '', label: 'Choose a category…' }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Amount (R)" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} step={10} prefix="R" />
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Date</span>
              <input
                type="date"
                className="date-input"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </label>
          </div>
          <button type="submit" className="sr-only">Save</button>
        </form>
      </Modal>

      {/* Delete confirmations */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete?.planned !== undefined) removeBudgetLine(pendingDelete.id)
          else removeExpense(pendingDelete.id)
          setPendingDelete(null)
        }}
        title={pendingDelete?.planned !== undefined ? 'Remove category?' : 'Delete expense?'}
        confirmLabel={pendingDelete?.planned !== undefined ? 'Remove category' : 'Delete expense'}
        danger
      >
        <p className="text-sm text-[var(--gfx-muted)]">
          {pendingDelete?.planned !== undefined
            ? `"${pendingDelete?.category}" will be removed from your budget plan. Expenses already logged in this category stay in the ledger.`
            : `"${pendingDelete?.note || pendingDelete?.category}" (${formatCurrency(pendingDelete?.amount ?? 0)}) will be removed from the ledger.`}
        </p>
      </ConfirmDialog>
    </div>
  )
}
