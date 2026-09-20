import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/Primitives.jsx'
import { IconGhost, IconSend, IconX } from './ui/icons.jsx'
import { formatCurrency } from '../lib/format'
import { buildInsights } from '../lib/insights'
import { monthlyNet, roundMoney, subscriptionBurden } from '../lib/finance'

/**
 * Ghost assistant — the UI surface for decision support.
 *
 * IMPORTANT: there is no AI model behind this in the prototype phase.
 * Answers are deterministic, rule-based responses computed from the user's
 * own numbers, and every reply says so. The message shape mirrors what a
 * future local/RAG backend would return, so the UI won't need to change.
 */
const SUGGESTED_PROMPTS = [
  'How am I doing this month?',
  'What subscriptions could I cut?',
  'Where is my money going?',
  'Can I afford a big purchase?',
]

export default function GhostAssistant({ open, onClose, finance }) {
  const [messages, setMessages] = useState(finance.ghostDemoConversation)
  const [draft, setDraft] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus?.()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight })
  }, [messages])

  const answer = (question) => {
    const { profile, expenses, goals, subscriptions, overview } = finance
    const q = question.toLowerCase()
    const insights = buildInsights({ profile, expenses, goals, subscriptions, overview })

    if (q.includes('month') || q.includes('doing') || q.includes('how am i')) {
      return `You have spent ${formatCurrency(overview.totalSpent, { compact: true })} of your ${formatCurrency(profile.monthlyBudget, { compact: true })} budget (${Math.round(overview.budgetUsed * 100)}%). Balance after expenses: ${formatCurrency(overview.remainingBalance, { compact: true })}. ${overview.overBudget ? 'You are over budget — the Spending view shows where it went.' : 'You are still inside your budget.'}`
    }
    if (q.includes('subscription') || q.includes('cut') || q.includes('cancel')) {
      if (subscriptions.length === 0) return 'You have no subscriptions tracked yet — add some in the Subscriptions view and I can point out the heavy ones.'
      const burden = subscriptionBurden(subscriptions, profile.monthlyIncome, profile.monthlyBudget)
      const sorted = [...subscriptions].sort((a, b) => b.amount - a.amount)
      return `Your subscriptions cost about ${formatCurrency(burden.monthly, { compact: true })}/month (${formatCurrency(burden.yearly, { compact: true })}/year) — ${Math.round(burden.shareOfIncome * 100)}% of income. The largest is "${sorted[0].name}" at ${formatCurrency(sorted[0].amount, { compact: true })} per ${sorted[0].billingCycle === 'monthly' ? 'month' : sorted[0].billingCycle === 'quarterly' ? 'quarter' : 'year'}. The What-if mode can simulate cancelling it before you decide.`
    }
    if (q.includes('goal')) {
      if (goals.length === 0) return 'No goals yet — the Goals view can create one in a few taps.'
      const goal = goals.find((g) => q.includes(g.name.toLowerCase().split(' ')[0])) ?? goals[0]
      const gap = Math.max(0, goal.target - goal.saved)
      const weeks = Math.max(1, Math.ceil((new Date(goal.targetDate) - new Date()) / (7 * 24 * 60 * 60 * 1000)))
      const need = roundMoney(gap / weeks)
      return `"${goal.name}" is ${Math.round((goal.saved / goal.target) * 100)}% funded: ${formatCurrency(goal.saved, { compact: true })} of ${formatCurrency(goal.target, { compact: true })}. To land on time, about ${formatCurrency(need, { compact: true })} per week for ${weeks} weeks. If that is too steep, pushing the target date is a valid option.`
    }
    if (q.includes('afford')) {
      const net = monthlyNet(profile.monthlyIncome, profile.monthlyBudget)
      return `Your balance is ${formatCurrency(profile.availableBalance, { compact: true })}, and your plan frees ${formatCurrency(net, { compact: true })} per month. The Can-I-Afford-This tool runs the exact numbers for any price — including what it does to your budget and savings pace.`
    }
    if (q.includes('where') || q.includes('going') || q.includes('spend')) {
      if (expenses.length === 0) return 'No expenses logged yet, so I cannot break down spending. Add some in the Expenses view.'
      const map = new Map()
      for (const e of expenses) map.set(e.category, roundMoney((map.get(e.category) ?? 0) + e.amount))
      const top = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      return `Your top three spending categories: ${top.map(([cat, val]) => `${cat} at ${formatCurrency(val, { compact: true })}`).join(', ')}. The Spending breakdown view has the full picture.`
    }
    return `Here is what stands out right now: ${insights[0].title.toLowerCase()} — ${insights[0].detail} (All answers are computed from your own entries — no AI model, no data leaves your browser.)`
  }

  const send = (text) => {
    const question = text.trim()
    if (!question) return
    setMessages((prev) => [...prev, { id: `q-${Date.now()}`, role: 'user', text: question }])
    setDraft('')
    // Deterministic reply, computed synchronously from local state.
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'ghost', text: answer(question) }])
    }, 220) // small delay so the exchange feels conversational, not laggy
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Ghost assistant">
      <button type="button" aria-label="Close assistant" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="gfx-enter absolute inset-x-0 bottom-0 top-auto flex max-h-[85vh] flex-col rounded-t-2xl border-t border-[var(--gfx-border-strong)] bg-[var(--gfx-surface)] shadow-[var(--gfx-shadow-lg)] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-96 sm:rounded-l-2xl sm:rounded-tr-none sm:border-l sm:border-t-0">
        <header className="flex items-center justify-between border-b border-[var(--gfx-border)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gfx-accent-soft)] text-[var(--gfx-accent)]">
              <IconGhost className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--gfx-text)]">Ghost</p>
              <p className="text-[11px] text-[var(--gfx-faint)]">Prototype — rule-based, from your own numbers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="rounded-lg p-1.5 text-[var(--gfx-muted)] hover:bg-[var(--gfx-surface-2)] hover:text-[var(--gfx-text)]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
              <p className="text-sm text-[var(--gfx-muted)]">
                Hi — I'm Ghost. I explain what your numbers show; I don't decide for you, and I'm
                not an AI model. Ask me anything about your month.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-br-md bg-[var(--gfx-accent-strong)] text-[var(--gfx-accent-ink)]'
                    : 'rounded-bl-md border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] text-[var(--gfx-muted)]'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              className="rounded-full border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-1.5 text-xs text-[var(--gfx-muted)] transition-colors hover:border-[var(--gfx-accent-strong)] hover:text-[var(--gfx-text)]"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          className="flex items-center gap-2 border-t border-[var(--gfx-border)] px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault()
            send(draft)
          }}
        >
          <label className="flex-1">
            <span className="sr-only">Ask Ghost a question</span>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about your money…"
              className="w-full rounded-full border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-4 py-2 text-sm text-[var(--gfx-text)] placeholder:text-[var(--gfx-faint)] focus:border-[var(--gfx-accent-strong)] focus:outline-none"
            />
          </label>
          <Button type="submit" aria-label="Send message" disabled={!draft.trim()}>
            <IconSend className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
