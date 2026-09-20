import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Modal, { ConfirmDialog } from '../components/ui/Modal.jsx'
import {
  Button,
  EmptyState,
  NumberField,
  SelectField,
  StatCard,
  TextField,
} from '../components/ui/Primitives.jsx'
import { CategoryBars } from '../components/charts/Charts.jsx'
import { formatCurrency, formatDate } from '../lib/format'
import { expensesByCategory, roundMoney } from '../lib/finance'
import { IconWallet } from '../components/ui/icons.jsx'

const EMPTY_FORM = { name: '', amount: 0, category: '', date: '' }

export default function ExpensesView({ finance }) {
  const { expenses, categories, overview, addExpense, removeExpense } = finance
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [filter, setFilter] = useState('all')
  const [pendingDelete, setPendingDelete] = useState(null)

  const categoryOptions = categories.map((c) => ({ value: c, label: c }))
  const filtered = useMemo(
    () => (filter === 'all' ? expenses : expenses.filter((e) => e.category === filter)),
    [expenses, filter],
  )
  const filteredTotal = roundMoney(filtered.reduce((sum, e) => sum + e.amount, 0))
  const categoryData = useMemo(
    () => expensesByCategory(expenses).map((entry) => ({ label: entry.category, value: entry.total })),
    [expenses],
  )

  const submitExpense = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return setFormError('Give the expense a name.')
    if (form.amount <= 0) return setFormError('Amount must be greater than zero.')
    if (!form.category) return setFormError('Choose a category.')
    if (!form.date) return setFormError('Pick a date.')
    addExpense({ name, amount: roundMoney(form.amount), category: form.category, date: form.date })
    setForm(EMPTY_FORM)
    setFormError('')
    setAddOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Log what you spend. Totals everywhere in the app are calculated from this ledger."
      >
        <Button onClick={() => { setFormError(''); setAddOpen(true) }}>+ Add expense</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Expenses logged" value={String(expenses.length)} sub={`${filtered.length} shown`} />
        <StatCard label="Total spent" value={formatCurrency(overview.totalSpent, { compact: true })} sub="all categories" />
        <StatCard label="Budget remaining" value={formatCurrency(overview.budgetRemaining, { compact: true })} tone={overview.overBudget ? 'danger' : 'accent'} sub={`${Math.round(overview.budgetUsed * 100)}% of budget used`} />
        <StatCard label="Balance remaining" value={formatCurrency(overview.remainingBalance, { compact: true })} tone={overview.remainingBalance < 0 ? 'danger' : 'default'} sub={`of ${formatCurrency(finance.profile.availableBalance, { compact: true })}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Ledger" subtitle={filter === 'all' ? 'All expenses' : `Filtered: ${filter}`} className="lg:col-span-2">
          <div className="mb-4 max-w-xs">
            <SelectField
              label="Filter by category"
              value={filter}
              onChange={setFilter}
              options={[{ value: 'all', label: 'All categories' }, ...categoryOptions]}
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={IconWallet}
              title={expenses.length === 0 ? 'No expenses yet' : 'Nothing in this category'}
              description={
                expenses.length === 0
                  ? 'Log your first expense and watch totals, charts, and the calendar update instantly.'
                  : 'Try another category, or add an expense to this one.'
              }
              action={<Button onClick={() => setAddOpen(true)}>+ Add expense</Button>}
            />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between border-b border-[var(--gfx-border)] pb-2 text-xs uppercase tracking-wide text-[var(--gfx-faint)]">
                <span>{filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}</span>
                <span className="tabular">Total {formatCurrency(filteredTotal)}</span>
              </div>
              <ul className="divide-y divide-[var(--gfx-border)]/60">
                {filtered.map((expense) => (
                  <li key={expense.id} className="group flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--gfx-text)]">{expense.name}</p>
                      <p className="text-xs text-[var(--gfx-faint)]">{formatDate(expense.date)} · {expense.category}</p>
                    </div>
                    <span className="tabular text-sm font-medium text-[var(--gfx-text)]">{formatCurrency(expense.amount)}</span>
                    <Button
                      variant="danger"
                      size="sm"
                      className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                      onClick={() => setPendingDelete(expense)}
                      aria-label={`Delete ${expense.name}`}
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="By category" subtitle="Updates as the ledger changes">
          {categoryData.length === 0 ? (
            <EmptyState icon={IconWallet} title="Nothing logged yet" description="Category totals appear once expenses are recorded." />
          ) : (
            <CategoryBars data={categoryData} />
          )}
        </Card>
      </div>

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
          <TextField label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Weekly groceries" />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Amount (R)" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} step={10} prefix="R" />
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--gfx-muted)]">Date</span>
              <input type="date" className="date-input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </label>
          </div>
          <SelectField label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} options={[{ value: '', label: 'Choose a category…' }, ...categoryOptions]} />
          {formError && <p role="alert" className="text-sm text-[var(--gfx-danger)]">{formError}</p>}
          <button type="submit" className="sr-only">Save</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => removeExpense(pendingDelete.id)}
        title="Delete expense?"
        confirmLabel="Delete expense"
        danger
      >
        <p className="text-sm text-[var(--gfx-muted)]">
          "{pendingDelete?.name}" ({formatCurrency(pendingDelete?.amount ?? 0)}) will be removed from the ledger and all totals.
        </p>
      </ConfirmDialog>
    </div>
  )
}
