import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Modal, { ConfirmDialog } from '../components/ui/Modal.jsx'
import { Badge, Button, Disclaimer, EmptyState, NumberField, SelectField, StatCard, TextField } from '../components/ui/Primitives.jsx'
import { formatCurrency } from '../lib/format'
import { IconTag } from '../components/ui/icons.jsx'

const EMPTY_ITEM = { name: '', category: 'Electronics', currentPrice: 0, targetPrice: 0, store: '', notes: '' }
const CATEGORIES = ['Electronics', 'Study', 'Clothing', 'Connectivity', 'Other']

export default function ShoppingView({ finance }) {
  const { shoppingItems, deals, addShoppingItem, updateShoppingItem, removeShoppingItem } = finance
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_ITEM)
  const [pendingDelete, setPendingDelete] = useState(null)

  // Deterministic watch math: discount-to-target and price-drop alert state.
  const itemsWithMath = shoppingItems.map((item) => {
    const discountNeeded = item.currentPrice > 0
      ? Math.round(((item.currentPrice - item.targetPrice) / item.currentPrice) * 100)
      : 0
    const status = item.currentPrice <= item.targetPrice ? 'at-target' : discountNeeded <= 15 ? 'close' : 'watching'
    return { ...item, discountNeeded, status }
  })
  const atTarget = itemsWithMath.filter((item) => item.status === 'at-target').length
  const closeCount = itemsWithMath.filter((item) => item.status === 'close').length
  const potentialSaving = itemsWithMath.reduce((sum, item) => sum + Math.max(0, item.currentPrice - item.targetPrice), 0)

  const submitAdd = (event) => {
    event.preventDefault()
    if (!form.name.trim() || form.currentPrice <= 0) return
    addShoppingItem({ ...form, name: form.name.trim(), store: form.store.trim(), notes: form.notes.trim() })
    setForm(EMPTY_ITEM)
    setAddOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Smart shopping"
        subtitle="Track what you want to buy, set target prices, and let patience do the saving."
      >
        <Button onClick={() => setAddOpen(true)}>+ Track an item</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tracked items" value={String(shoppingItems.length)} />
        <StatCard label="At target price" value={String(atTarget)} tone="accent" />
        <StatCard label="Within 15% of target" value={String(closeCount)} tone="info" />
        <StatCard label="Potential saving" value={formatCurrency(potentialSaving, { compact: true })} sub="if everything hits target" />
      </div>

      {shoppingItems.length === 0 ? (
        <EmptyState
          icon={IconTag}
          title="Nothing on your watchlist"
          description="Track an item and its target price. GhostFinEx shows how big a discount you are waiting for — no store integrations, just honest math on prices you enter."
          action={<Button onClick={() => setAddOpen(true)}>+ Track an item</Button>}
        />
      ) : (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {itemsWithMath.map((item) => (
            <Card key={item.id} as="article" className="transition-colors hover:border-[var(--gfx-border-strong)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--gfx-text)]">{item.name}</p>
                  <p className="text-xs text-[var(--gfx-faint)]">
                    {item.category}{item.store ? ` · ${item.store}` : ''}
                  </p>
                </div>
                <Badge tone={item.status === 'at-target' ? 'accent' : item.status === 'close' ? 'info' : 'neutral'}>
                  {item.status === 'at-target' ? 'At target' : item.status === 'close' ? 'Close' : 'Watching'}
                </Badge>
              </div>

              <div className="tabular mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
                  <p className="text-xs text-[var(--gfx-faint)]">Current</p>
                  <NumberField label="" aria-label={`Current price for ${item.name}`} value={item.currentPrice} onChange={(v) => updateShoppingItem(item.id, { currentPrice: v })} step={50} prefix="R" />
                </div>
                <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
                  <p className="text-xs text-[var(--gfx-faint)]">Target</p>
                  <NumberField label="" aria-label={`Target price for ${item.name}`} value={item.targetPrice} onChange={(v) => updateShoppingItem(item.id, { targetPrice: v })} step={50} prefix="R" />
                </div>
                <div className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2">
                  <p className="text-xs text-[var(--gfx-faint)]">Discount needed</p>
                  <p className={`mt-1.5 text-lg font-semibold ${item.status === 'at-target' ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-text)]'}`}>
                    {item.currentPrice <= item.targetPrice ? 'Reached' : `${item.discountNeeded}%`}
                  </p>
                </div>
              </div>

              {item.notes && <p className="mt-3 text-xs text-[var(--gfx-faint)]">{item.notes}</p>}

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--gfx-border)] pt-3">
                <p className="text-xs text-[var(--gfx-faint)]">
                  {item.currentPrice <= item.targetPrice
                    ? 'Target met — decide whether to buy or keep saving.'
                    : `Waiting for about ${formatCurrency(Math.max(0, item.currentPrice - item.targetPrice))} off.`}
                </p>
                <Button variant="danger" size="sm" onClick={() => setPendingDelete(item)}>Remove</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card title="Student deals to check" subtitle="Static demo list — no live store data" className="mb-6">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <li key={deal.id} className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
              <div className="flex items-center justify-between gap-2">
                <Badge tone="violet">{deal.category}</Badge>
                <span className="text-xs text-[var(--gfx-faint)]">{deal.endsInDays}d left</span>
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--gfx-text)]">{deal.title}</p>
              <p className="text-xs text-[var(--gfx-faint)]">{deal.store}</p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mb-6">
        <Disclaimer>
          Smart Shopping tracks prices you enter yourself — there is no live store or price API in
          this phase. The "afford it first" question lives in the Can-I-Afford-This tool.
        </Disclaimer>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Track an item"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd}>Add to watchlist</Button>
          </>
        }
      >
        <form onSubmit={submitAdd} className="space-y-4">
          <TextField label="Item name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Noise-cancelling headphones" />
          <SelectField
            label="Category"
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Current price (R)" value={form.currentPrice} onChange={(v) => setForm((f) => ({ ...f, currentPrice: v }))} step={50} prefix="R" />
            <NumberField label="Target price (R)" value={form.targetPrice} onChange={(v) => setForm((f) => ({ ...f, targetPrice: v }))} step={50} prefix="R" />
          </div>
          <TextField label="Store (optional)" value={form.store} onChange={(v) => setForm((f) => ({ ...f, store: v }))} placeholder="e.g. Takealot" />
          <TextField label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="e.g. Wait for month-end sale" />
          <button type="submit" className="sr-only">Add</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => removeShoppingItem(pendingDelete.id)}
        title="Remove tracked item?"
        confirmLabel="Remove"
        danger
      >
        <p className="text-sm text-[var(--gfx-muted)]">"{pendingDelete?.name}" will be removed from your watchlist.</p>
      </ConfirmDialog>
    </div>
  )
}
