import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Modal, { ConfirmDialog } from '../components/ui/Modal.jsx'
import { Badge, Button, Disclaimer, EmptyState, NumberField, SelectField, StatCard, TextField } from '../components/ui/Primitives.jsx'
import { formatCurrency } from '../lib/format'
import { roundMoney, sumAmounts } from '../lib/finance'
import { ACCOUNT_TYPES } from '../data/mockData'
import { IconWallet } from '../components/ui/icons.jsx'

const TYPE_OPTIONS = ACCOUNT_TYPES.map((type) => ({ value: type, label: type }))
const TYPE_TONES = { Cash: 'accent', 'Bank account': 'info', 'Savings account': 'violet', Other: 'neutral' }
const EMPTY_ACCOUNT = { name: '', type: 'Bank account', balance: 0, note: '' }

/**
 * Accounts — where the user's money is held. Purely local state: no bank
 * connections, no transaction sync, no imports. Balances are entered and
 * edited by the user.
 */
export default function AccountsView({ finance }) {
  const { accounts, addAccount, updateAccount, removeAccount } = finance

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_ACCOUNT)
  const [formError, setFormError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)

  const openAddModal = () => {
    setForm(EMPTY_ACCOUNT)
    setFormError('')
    setAddOpen(true)
  }

  const total = sumAmounts(accounts.map((a) => a.balance))
  const byType = ACCOUNT_TYPES.map((type) => ({
    type,
    total: sumAmounts(accounts.filter((a) => a.type === type).map((a) => a.balance)),
  })).filter((row) => row.total > 0)

  const submitAccount = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return setFormError('Give the account a name.')
    if (form.balance < 0) return setFormError('Balance cannot be negative.')
    addAccount({ name, type: form.type, balance: roundMoney(form.balance), note: form.note.trim() })
    setForm(EMPTY_ACCOUNT)
    setFormError('')
    setAddOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Where your money is held — current balances you enter and update yourself. No bank connections, no automatic transaction syncing."
      >
        <Button onClick={openAddModal}>+ Add account</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total across accounts" value={formatCurrency(total, { compact: true })} sub={`${accounts.length} account${accounts.length === 1 ? '' : 's'}`} tone="accent" />
        {byType.slice(0, 3).map((row) => (
          <StatCard key={row.type} label={row.type} value={formatCurrency(row.total, { compact: true })} sub="entered balance" />
        ))}
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={IconWallet}
          title="No accounts yet"
          description="Add the places your money lives — a bank card, wallet cash, a savings account. Balances are manual entries for now."
          action={<Button onClick={openAddModal}>+ Add account</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <Card key={account.id} as="article" title={account.name} subtitle={account.note || undefined} actions={<Badge tone={TYPE_TONES[account.type] ?? 'neutral'}>{account.type}</Badge>}>
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="Balance (R)"
                  value={account.balance}
                  onChange={(v) => updateAccount(account.id, { balance: roundMoney(Math.max(0, Number(v) || 0)) })}
                  step={100}
                  prefix="R"
                />
                <TextField label="Account name" value={account.name} onChange={(v) => updateAccount(account.id, { name: v })} />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <SelectField label="Account type" value={account.type} onChange={(v) => updateAccount(account.id, { type: v })} options={TYPE_OPTIONS} />
                <TextField label="Note (optional)" value={account.note ?? ''} onChange={(v) => updateAccount(account.id, { note: v })} placeholder="What this account is for" />
              </div>
              <div className="mt-3 flex justify-end border-t border-[var(--gfx-border)] pt-3">
                <Button variant="danger" size="sm" onClick={() => setPendingDelete(account)}>Remove account</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add account"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAccount}>Save account</Button>
          </>
        }
      >
        <form onSubmit={submitAccount} className="space-y-4">
          <TextField label="Account name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Everyday card" />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Account type" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={TYPE_OPTIONS} />
            <NumberField label="Balance (R)" value={form.balance} onChange={(v) => setForm((f) => ({ ...f, balance: v }))} step={100} prefix="R" />
          </div>
          <TextField label="Note (optional)" value={form.note} onChange={(v) => setForm((f) => ({ ...f, note: v }))} placeholder="What this account is for" />
          {formError && <p role="alert" className="text-sm text-[var(--gfx-danger)]">{formError}</p>}
          <button type="submit" className="sr-only">Save</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => removeAccount(pendingDelete.id)}
        title="Remove account?"
        confirmLabel="Remove account"
        danger
      >
        <p className="text-sm text-[var(--gfx-muted)]">
          "{pendingDelete?.name}" ({formatCurrency(pendingDelete?.balance ?? 0, { compact: true })}) will be removed from this list.
          Savings goals and expenses are not affected.
        </p>
      </ConfirmDialog>

      <div className="mt-6">
        <Disclaimer>
          Account balances are the current amounts you hold — you enter and update them yourself.
          Logging an expense or a savings contribution records history; it never silently changes
          these balances. GhostFinEx does not connect to banks or sync transactions — you stay in
          control of every number.
        </Disclaimer>
      </div>
    </div>
  )
}
