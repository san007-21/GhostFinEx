/**
 * BookDetailModal — full details for one curated book.
 *
 * Shows the catalog metadata (title, author, category, level, topics), the
 * editorial "why suggested" text, connections to matching Learning Hub
 * lessons (education cross-links, not advice), and an opt-in current-web
 * research block (Tavily) for availability/editions.
 *
 * The AI block is rendered only when GhostFinEx can actually reach the
 * ghost-ai function — every failure is a calm, honest message. No AI text
 * is ever presented as book fact: the factual foundation stays the
 * deterministic catalog.
 */

import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import { Badge, Button } from '../ui/Primitives.jsx'
import { askGhost } from '../../lib/ghostAi.js'
import BookWebSources from './BookWebSources.jsx'

export default function BookDetailModal({ book, onClose, lessons = [], onOpenLesson }) {
  const [ai, setAi] = useState({ state: 'idle', text: '', error: '' })

  const linkedLessons = lessons.filter((lesson) => book.lessonIds?.includes(lesson.id))

  async function explainFit() {
    setAi({ state: 'loading', text: '', error: '' })
    const { data, error } = await askGhost(
      `In 3–4 sentences, explain why the book "${book.title}" by ${book.author} may help a student learning about: ${book.topics.join(', ')}. Keep it general education, do not claim it will fix their finances, and do not give investment instructions.`,
    )
    if (error) {
      setAi({ state: 'error', text: '', error })
      return
    }
    setAi({ state: 'ready', text: data.answer, error: '' })
  }

  return (
    <Modal open onClose={onClose} title="Book details">
      <div className="space-y-4">
        <div>
          <Badge tone="accent">{book.category}</Badge>
          <h3 className="mt-2 text-lg font-semibold text-[var(--gfx-text)]">{book.title}</h3>
          <p className="text-sm text-[var(--gfx-muted)]">by {book.author}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{book.level}</Badge>
            {book.topics.map((topic) => (
              <Badge key={topic}>{topic}</Badge>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gfx-accent)]">
            Why GhostFinEx suggests this
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--gfx-muted)]">
            {book.whySuggested}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--gfx-muted)]">
            {book.description}
          </p>
        </div>

        {/* AI explanation — strictly optional, clearly labeled, honest on failure */}
        <div className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
          <p className="text-sm font-medium text-[var(--gfx-text)]">
            How this may fit your learning
          </p>
          {ai.state === 'idle' && (
            <>
              <p className="mt-1 text-xs text-[var(--gfx-muted)]">
                Ghost AI can rephrase why this book may suit your learning goal — based only on
                the book's topics, never on your financial data.
              </p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={explainFit}>
                Explain with Ghost AI
              </Button>
            </>
          )}
          {ai.state === 'loading' && (
            <p className="mt-2 text-xs text-[var(--gfx-faint)]" aria-live="polite">
              Ghost is thinking…
            </p>
          )}
          {ai.state === 'error' && (
            <div className="mt-2">
              <p className="text-xs text-[var(--gfx-warn)]">{ai.error}</p>
              <p className="mt-1 text-xs text-[var(--gfx-faint)]">
                The book details above don't depend on AI — they're part of the curated catalog.
              </p>
              <Button size="sm" variant="ghost" className="mt-2" onClick={explainFit}>
                Try again
              </Button>
            </div>
          )}
          {ai.state === 'ready' && (
            <div className="mt-2">
              <p className="rounded-lg bg-[var(--gfx-surface-3)] p-3 text-sm leading-relaxed text-[var(--gfx-muted)]">
                {ai.text}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--gfx-faint)]">
                AI-generated explanation — general education only, not financial advice.
              </p>
              <Button size="sm" variant="ghost" className="mt-2" onClick={explainFit}>
                Regenerate
              </Button>
            </div>
          )}
        </div>

        {/* Learning Hub cross-links */}
        {linkedLessons.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gfx-faint)]">
              Related Learning Hub lessons
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {linkedLessons.map((lesson) => (
                <Button
                  key={lesson.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => onOpenLesson?.(lesson.id)}
                >
                  {lesson.topic} →
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Opt-in current-web research (Tavily) */}
        <BookWebSources
          query={`"${book.title}" ${book.author} book where to find`}
          searchLabel="Search availability"
        />

        <p className="text-[11px] leading-relaxed text-[var(--gfx-faint)]">
          GhostFinEx doesn't sell books and takes no payment for any title. What you read — and
          whether you buy anything — is entirely your decision.
        </p>
      </div>
    </Modal>
  )
}
