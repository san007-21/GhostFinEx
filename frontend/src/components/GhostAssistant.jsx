import { useEffect, useRef, useState } from 'react'
import { IconGhost, IconX } from './ui/icons.jsx'
import { formatCurrency } from '../lib/format'
import { buildInsights } from '../lib/insights'
import {
  expensesInMonth,
  goalStats,
  monthlyNet,
  roundMoney,
  subscriptionBurden,
  affordabilityAnalysis,
} from '../lib/finance'
import { classifyIntent } from '../lib/webIntent'
import { searchWeb } from '../lib/webSearch'
import { askGhost } from '../lib/ghostAi'
import { priceSignal, describePriceSignal, domainOf } from '../lib/priceSignals'
import { stashPriceSuggestion } from '../lib/priceHandoff'
import { useAuth } from '../auth/useAuth.js'

/**
 * Ghost assistant.
 *
 * Architecture:
 * - Personal finance calculations stay deterministic and local.
 * - Current web questions use Tavily through the web-search Edge Function.
 * - Financial education and natural conversation use the Ghost AI Edge Function.
 * - Ghost AI receives conversation text and educational RAG context, but not
 *   the user's private financial database.
 */

const SUGGESTED_PROMPTS = [
  'How am I doing this month?',
  'What subscriptions could I cut?',
  'Where is my money going?',
  'Current price of a refurbished laptop?',
]

export default function GhostAssistant({ open, onClose, finance, onNavigate }) {
  const auth = useAuth()
  const [messages, setMessages] = useState(finance.ghostDemoConversation)
  const [draft, setDraft] = useState('')
  const [webBusy, setWebBusy] = useState(false)
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
    listRef.current?.scrollTo?.({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, webBusy])

  /*
   * Deterministic personal-finance responses.
   *
   * These are intentionally kept outside the AI model.
   * If Ghost needs the user's actual financial numbers, the application
   * calculates them here instead of asking the model to invent them.
   */
  const answerPersonalFinanceQuestion = (question) => {
    const {
      profile,
      expenses,
      goals,
      subscriptions,
      overview,
    } = finance

    const q = question.toLowerCase()
    const insights = buildInsights({
      profile,
      expenses,
      goals,
      subscriptions,
      overview,
    })

    if (
      q.includes('month') ||
      q.includes('doing') ||
      q.includes('how am i')
    ) {
      return `This month you have spent ${formatCurrency(
        overview.monthSpent,
        { compact: true },
      )} of your ${formatCurrency(
        profile.monthlyBudget,
        { compact: true },
      )} budget (${Math.round(
        overview.budgetUsed * 100,
      )}%). You currently hold ${formatCurrency(
        overview.availableBalance,
        { compact: true },
      )} across your accounts. ${
        overview.overBudget
          ? 'You are over budget. The Spending view shows where it went.'
          : 'You are still inside your budget.'
      }`
    }

    if (
      q.includes('subscription') ||
      q.includes('cut') ||
      q.includes('cancel')
    ) {
      if (subscriptions.length === 0) {
        return 'You have no subscriptions tracked yet. Add some in the Subscriptions view and I can point out the heavier recurring costs.'
      }

      const burden = subscriptionBurden(
        subscriptions,
        profile.monthlyIncome,
        profile.monthlyBudget,
      )

      const sorted = [...subscriptions].sort(
        (a, b) => b.amount - a.amount,
      )

      return `Your subscriptions cost about ${formatCurrency(
        burden.monthly,
        { compact: true },
      )}/month (${formatCurrency(
        burden.yearly,
        { compact: true },
      )}/year), which is about ${Math.round(
        burden.shareOfIncome * 100,
      )}% of income. The largest is "${sorted[0].name}" at ${formatCurrency(
        sorted[0].amount,
        { compact: true },
      )} per ${
        sorted[0].billingCycle === 'monthly'
          ? 'month'
          : sorted[0].billingCycle === 'quarterly'
            ? 'quarter'
            : 'year'
      }. The What-if mode can simulate cancelling it before you decide.`
    }

    if (q.includes('goal')) {
      if (goals.length === 0) {
        return 'No goals yet. The Goals view can create one in a few taps.'
      }

      const goal =
        goals.find((item) =>
          q.includes(item.name.toLowerCase().split(' ')[0]),
        ) ?? goals[0]

      const stats = goalStats(goal)

      if (stats.isComplete) {
        return `"${goal.name}" is fully funded: ${formatCurrency(
          goal.saved,
          { compact: true },
        )} of ${formatCurrency(
          goal.target,
          { compact: true },
        )}. Time to set the next target.`
      }

      const percent =
        goal.target > 0
          ? Math.round((goal.saved / goal.target) * 100)
          : 0

      const weeklyLine =
        stats.weeksLeft > 0 && stats.weeklyNeeded > 0
          ? ` To land on time, about ${formatCurrency(
              stats.weeklyNeeded,
              { compact: true },
            )} per week for ${stats.weeksLeft} ${
              stats.weeksLeft === 1 ? 'week' : 'weeks'
            }. If that is too steep, pushing the target date is a valid option.`
          : ' No target date is set yet. Add one in the Goals view and I can pace it for you.'

      return `"${goal.name}" is ${percent}% funded: ${formatCurrency(
        goal.saved,
        { compact: true },
      )} of ${formatCurrency(
        goal.target,
        { compact: true },
      )}.${weeklyLine}`
    }

    if (q.includes('afford')) {
      const net = monthlyNet(
        profile.monthlyIncome,
        profile.monthlyBudget,
      )

      return `Your balance is ${formatCurrency(
        profile.availableBalance,
        { compact: true },
      )}, and your current plan frees about ${formatCurrency(
        net,
        { compact: true },
      )} per month. For a specific purchase, the Can-I-Afford-This tool runs the exact numbers, including the effect on your budget and savings pace.`
    }

    if (
      q.includes('where') ||
      q.includes('going') ||
      q.includes('spend')
    ) {
      if (expenses.length === 0) {
        return 'No expenses are logged yet, so I cannot break down your spending. Add some in the Expenses view.'
      }

      const monthOnly = expensesInMonth(expenses)
      const map = new Map()

      for (const expense of monthOnly) {
        map.set(
          expense.category,
          roundMoney(
            (map.get(expense.category) ?? 0) +
              expense.amount,
          ),
        )
      }

      const top = [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      if (top.length === 0) {
        return 'Nothing is logged this month yet. The Spending breakdown has your all-time picture.'
      }

      return `This month's top three spending categories: ${top
        .map(
          ([category, value]) =>
            `${category} at ${formatCurrency(value, {
              compact: true,
            })}`,
        )
        .join(
          ', ',
        )}. The Spending breakdown view has the full picture.`
    }

    const firstInsight = insights[0]

    if (!firstInsight) {
      return 'I do not have enough financial activity yet to point out a useful pattern. Add a few expenses, goals, or subscriptions and I can help you inspect them.'
    }

    return `Here is what stands out right now: ${firstInsight.title.toLowerCase()} — ${firstInsight.detail}`
  }

  /*
   * Add one Ghost response to the conversation.
   */
  const addGhostMessage = (text, extra = {}) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        role: 'ghost',
        text,
        ...extra,
      },
    ])
  }

  /*
   * Main message router.
   *
   * Personal financial calculations stay local.
   * Current web research stays on the web-search path.
   * Everything else gets the real conversational Ghost model.
   */
  const send = async (text) => {
    const question = text.trim()

    if (!question || webBusy) return

    const previousMessages = messages

    setMessages((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}`,
        role: 'user',
        text: question,
      },
    ])

    setDraft('')

    const intent = classifyIntent(question)

    /*
     * PERSONAL FINANCE
     *
     * Keep actual financial calculations deterministic.
     */
    if (
      intent.type === 'personal' ||
      intent.type === 'finance'
    ) {
      addGhostMessage(
        answerPersonalFinanceQuestion(question),
      )
      return
    }

    /*
     * CURRENT WEB
     *
     * Tavily handles current information such as prices.
     */
    if (intent.needsWeb) {
      if (
        !auth ||
        auth.isDemo ||
        !auth.user ||
        auth.user.isDemo
      ) {
        addGhostMessage(
          'Current-web search needs a signed-in account because the search service runs securely on the server. Your own financial tools still work in demo mode.',
        )
        return
      }

      setWebBusy(true)

      const { data, error } = await searchWeb(
        intent.searchQuery || question,
      )

      setWebBusy(false)

      if (error) {
        addGhostMessage(
          `I couldn't search the web just now. ${error} Your local financial tools are still available.`,
        )
        return
      }

      if (!data || data.results.length === 0) {
        addGhostMessage(
          "The web search didn't find anything useful for that, and I won't invent a price. Try naming the exact product or use Smart Shopping.",
        )
        return
      }

      const signal = priceSignal(data.results)
      const priceLine = describePriceSignal(signal)

      let affordabilityLine = ''
      let handoff = false

      if (
        intent.type === 'combined' &&
        signal.state === 'single' &&
        Number.isFinite(signal.price)
      ) {
        const analysis = affordabilityAnalysis({
          price: signal.price,
          availableBalance:
            finance.profile.availableBalance,
          monthlyBudget:
            finance.profile.monthlyBudget,
          monthlyIncome:
            finance.profile.monthlyIncome,
        })

        affordabilityLine = analysis.fitsNow
          ? ` At that price your balance would cover it, leaving ${formatCurrency(
              analysis.remainingAfterPurchase,
              { compact: true },
            )}.`
          : ` At that price your balance is ${formatCurrency(
              Math.abs(
                analysis.remainingAfterPurchase,
              ),
              { compact: true },
            )} short.`

        handoff = stashPriceSuggestion({
          price: signal.price,
          label: data.query,
          sourceDomain: signal.sourceDomain,
          sourceUrl: signal.sourceUrl,
        })
      }

      addGhostMessage(
        `${priceLine}${affordabilityLine}

Prices come from live web snippets, may be outdated or regional, and are never invented by me. Verify on the source page before deciding.${
          data.cached
            ? ' (Reusing a recent search to save quota.)'
            : ''
        }`,
        {
          kind: 'web',
          sources: data.results
            .slice(0, 3)
            .map((result) => ({
              title: result.title,
              url: result.url,
              domain: domainOf(result.url),
            })),
          handoff,
        },
      )

      return
    }

    /*
     * NATURAL CONVERSATION + KNOWLEDGE
     *
     * This is the important part.
     *
     * Greetings, casual conversation, financial education, brainstorming,
     * questions, confusion, and general discussion all reach the actual
     * Ghost AI model.
     */
    setWebBusy(true)

    const recentHistory = previousMessages
      .slice(-8)
      .map((message) => ({
        role:
          message.role === 'user'
            ? 'user'
            : 'assistant',
        content: message.text,
      }))
      .filter(
        (message) =>
          typeof message.content === 'string' &&
          message.content.trim().length > 0,
      )

    const { data, error } = await askGhost(
      question,
      {
        history: recentHistory,
      },
    )

    setWebBusy(false)

    if (error || !data) {
      addGhostMessage(
        error ||
          'Ghost could not answer right now. Try again in a moment.',
      )
      return
    }

    addGhostMessage(data.answer, {
      kind:
        data.sources.length > 0
          ? 'knowledge'
          : undefined,
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label="Ghost assistant"
    >
      <button
        type="button"
        aria-label="Close assistant"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="glass gfx-enter absolute inset-x-0 bottom-0 top-auto flex max-h-[85vh] flex-col rounded-t-2xl shadow-[var(--gfx-shadow-lg)] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-96 sm:rounded-l-2xl sm:rounded-tr-none sm:border-l sm:border-t-0">
        <header className="flex items-center justify-between border-b border-[var(--gfx-border)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gfx-accent-soft)] text-[var(--gfx-accent)]">
              <IconGhost className="h-5 w-5" />
            </span>

            <div>
              <p className="text-sm font-semibold text-[var(--gfx-text)]">
                Ghost
              </p>

              <p className="text-[11px] text-[var(--gfx-faint)]">
                AI financial thinking partner
              </p>
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

        <div
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && (
            <div className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
              <p className="text-sm leading-relaxed text-[var(--gfx-muted)]">
                Hi — I'm Ghost. 👻 I can chat naturally,
                explain money concepts, help you think
                through decisions, and show you what your
                numbers mean. I won't make the decision for
                you.
              </p>
            </div>
          )}

          {webBusy && (
            <div className="flex justify-start">
              <div
                aria-live="polite"
                className="rounded-2xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3.5 py-2.5 text-sm text-[var(--gfx-muted)]"
              >
                Ghost is thinking…
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === 'user'
                  ? 'flex justify-end'
                  : 'flex justify-start'
              }
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-br-md bg-[var(--gfx-accent-strong)] text-[var(--gfx-accent-ink)]'
                    : 'rounded-bl-md border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] text-[var(--gfx-muted)]'
                }`}
              >
                {message.kind === 'web' && (
                  <span className="mb-1.5 inline-block rounded-full border border-[rgba(96,165,250,0.35)] bg-[var(--gfx-info-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--gfx-info)]">
                    Current web research
                  </span>
                )}

                {message.kind === 'knowledge' && (
                  <span className="mb-1.5 inline-block rounded-full border border-[rgba(167,139,250,0.35)] bg-[var(--gfx-violet-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--gfx-violet)]">
                    From the knowledge library
                  </span>
                )}

                {message.text}

                {message.sources?.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-[var(--gfx-border)]/60 pt-2">
                    {message.sources.map((source) => (
                      <li
                        key={source.url}
                        className="truncate text-xs"
                      >
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--gfx-info)] underline-offset-2 hover:underline"
                        >
                          {source.domain ||
                            source.title}
                        </a>

                        <span className="text-[var(--gfx-faint)]">
                          {' '}
                          — {source.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {message.handoff &&
                  onNavigate && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onNavigate('afford')
                      }}
                      className="mt-2 rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface)] px-3 py-1.5 text-xs font-medium text-[var(--gfx-accent)] transition-colors hover:border-[var(--gfx-accent-strong)]"
                    >
                      Run the full affordability check →
                    </button>
                  )}
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
              disabled={webBusy}
              className="rounded-full border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-1.5 text-xs text-[var(--gfx-muted)] transition-colors hover:border-[var(--gfx-accent-strong)] hover:text-[var(--gfx-text)] disabled:cursor-not-allowed disabled:opacity-50"
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
            <span className="sr-only">
              Ask Ghost a question
            </span>

            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) =>
                setDraft(event.target.value)
              }
              placeholder="Talk to Ghost…"
              disabled={webBusy}
              className="w-full"
            />
          </label>

          <button
            type="submit"
            aria-label="Send message"
            disabled={!draft.trim() || webBusy}
            className="rounded-xl bg-[var(--gfx-accent-strong)] p-2.5 text-[var(--gfx-accent-ink)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="sr-only">Send</span>
            <span aria-hidden="true">➤</span>
          </button>
        </form>
      </div>
    </div>
  )
}
