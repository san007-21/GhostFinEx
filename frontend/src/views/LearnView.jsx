import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Badge, Button, Disclaimer, ProgressBar } from '../components/ui/Primitives.jsx'
import { formatCurrency } from '../lib/format'
import { roundMoney } from '../lib/finance'

const GLOSSARY = [
  { term: 'Zero-based budget', definition: 'Every rand of income gets a planned job — spending, saving, or sharing — until nothing is left unassigned.' },
  { term: 'Cost per use', definition: 'Price divided by how often you actually use it. A R199 service used twice a month costs about R100 per session.' },
  { term: 'Emergency buffer', definition: 'One month of essentials set aside so a surprise does not become debt.' },
  { term: 'Amortization', definition: 'Paying off a loan in fixed installments; early payments are mostly interest.' },
  { term: 'Opportunity cost', definition: 'What the next-best option would have given you. Every rand spent here is a rand not saved there.' },
]

export default function LearnView({ finance }) {
  const { lessons, profile, budgetLines, totals } = finance
  const [openId, setOpenId] = useState(lessons[0]?.id ?? null)
  const [readIds, setReadIds] = useState([])

  const markRead = (id) =>
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]))

  // Live worked example — deterministic, from the user's own numbers.
  const remaining = roundMoney(profile.monthlyIncome - totals.spent)
  const worstLine = [...budgetLines].sort((a, b) => b.spent - b.planned - (a.spent - a.planned))[0]
  const biggestLine = [...budgetLines].sort((a, b) => b.spent - a.spent)[0]

  return (
    <div>
      <PageHeader
        title="Learning hub"
        subtitle="Short lessons that use your own numbers as worked examples. Five minutes each, zero jargon."
      >
        <Badge tone="accent">{readIds.length} of {lessons.length} read</Badge>
      </PageHeader>

      <div className="mb-4">
        <ProgressBar value={lessons.length > 0 ? readIds.length / lessons.length : 0} tone="accent" label="Course progress" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {lessons.map((lesson, index) => {
          const isOpen = openId === lesson.id
          const isRead = readIds.includes(lesson.id)
          return (
            <Card key={lesson.id} as="article" className={isOpen ? 'lg:col-span-2' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gfx-surface-3)] text-sm font-semibold text-[var(--gfx-muted)]">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-[var(--gfx-text)]">{lesson.title}</h3>
                    <p className="mt-0.5 text-xs text-[var(--gfx-faint)]">{lesson.minutes} min read</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isRead && <Badge tone="accent">Read</Badge>}
                </div>
              </div>

              <p className="mt-3 text-sm text-[var(--gfx-muted)]">{lesson.summary}</p>

              {isOpen && (
                <div className="gfx-enter mt-4 space-y-3 border-t border-[var(--gfx-border)] pt-4">
                  <ol className="list-decimal space-y-2.5 pl-5 text-sm text-[var(--gfx-muted)]">
                    {lesson.body.map((paragraph, i) => (
                      <li key={i}>{paragraph}</li>
                    ))}
                  </ol>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant={isRead ? 'secondary' : 'primary'}
                      onClick={() => markRead(lesson.id)}
                      disabled={isRead}
                    >
                      {isRead ? 'Completed' : 'Mark as read'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              )}

              {!isOpen && (
                <button
                  type="button"
                  onClick={() => setOpenId(lesson.id)}
                  className="mt-3 text-sm font-medium text-[var(--gfx-accent)] transition-colors hover:text-[var(--gfx-text)]"
                >
                  Read lesson →
                </button>
              )}
            </Card>
          )
        })}
      </div>

      <Card title="Worked example — your month" subtitle="Computed live from your entries" className="mb-6">
        <div className="tabular grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
            <p className="text-xs text-[var(--gfx-faint)]">Income</p>
            <p className="text-xl font-semibold text-[var(--gfx-text)]">{formatCurrency(profile.monthlyIncome, { compact: true })}</p>
          </div>
          <div className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
            <p className="text-xs text-[var(--gfx-faint)]">Spent</p>
            <p className="text-xl font-semibold text-[var(--gfx-text)]">{formatCurrency(totals.spent, { compact: true })}</p>
          </div>
          <div className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
            <p className="text-xs text-[var(--gfx-faint)]">Still available</p>
            <p className={`text-xl font-semibold ${remaining < 0 ? 'text-[var(--gfx-danger)]' : 'text-[var(--gfx-accent)]'}`}>
              {formatCurrency(remaining, { compact: true })}
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-[var(--gfx-muted)]">
          {biggestLine && (
            <li className="flex gap-2">
              <span className="text-[var(--gfx-accent)]">•</span>
              <span>
                Your biggest category is <strong className="text-[var(--gfx-text)]">{biggestLine.category}</strong> at{' '}
                {formatCurrency(biggestLine.spent, { compact: true })}.
              </span>
            </li>
          )}
          {worstLine && worstLine.spent > worstLine.planned && (
            <li className="flex gap-2">
              <span className="text-[var(--gfx-warn)]">•</span>
              <span>
                <strong className="text-[var(--gfx-text)]">{worstLine.category}</strong> is{' '}
                {formatCurrency(worstLine.spent - worstLine.planned, { compact: true })} over plan — that is information, not judgment.
              </span>
            </li>
          )}
        </ul>
      </Card>

      <Card title="Plain-language glossary" subtitle="Six terms that cover most of personal finance">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GLOSSARY.map((entry) => (
            <div key={entry.term} className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
              <dt className="text-sm font-medium text-[var(--gfx-text)]">{entry.term}</dt>
              <dd className="mt-1 text-sm text-[var(--gfx-muted)]">{entry.definition}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mt-6">
        <Disclaimer>
          Lessons are general education, not personalized advice. The worked example recalculates
          from your own entries, so what you see is always your situation — never a claim about what
          you should do.
        </Disclaimer>
      </div>
    </div>
  )
}
