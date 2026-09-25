import { useMemo, useState } from 'react'
import {
  BOOK_CATEGORIES,
  BOOKS,
  CATEGORY_CHIP_LABELS,
  filterBooks,
} from '../../data/booksData.js'
import Card from '../ui/Card.jsx'
import { Badge, Button, EmptyState } from '../ui/Primitives.jsx'
import BookDetailModal from './BookDetailModal.jsx'
import BookComparisonBar from './BookComparisonBar.jsx'
import BookWebSources from './BookWebSources.jsx'

const MAX_COMPARE = 2

/**
 * BooksSection — "Books for Your Money Journey" inside the Learning Hub.
 *
 * The curated catalog is local and deterministic (booksData.js). Current-web
 * book research (Tavily) is strictly opt-in via BookWebSources. No purchase
 * links are fabricated, no scores or rankings are shown, and nothing here
 * touches financial data.
 *
 * Props:
 *   lessons      — Learning Hub lessons (for cross-links in the detail modal)
 *   onOpenLesson — called with a lesson id when the user follows a cross-link;
 *                  BooksSection closes its own modal first.
 */
export default function BooksSection({ lessons = [], onOpenLesson }) {
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [openBookId, setOpenBookId] = useState(null)
  const [compareIds, setCompareIds] = useState([])

  const books = useMemo(() => filterBooks({ category, query }), [category, query])
  const compareBooks = useMemo(
    () => compareIds.map((id) => BOOKS.find((b) => b.id === id)).filter(Boolean),
    [compareIds],
  )

  function toggleCompare(id) {
    setCompareIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id)
      if (ids.length >= MAX_COMPARE) return [ids[ids.length - 1], id]
      return [...ids, id]
    })
  }

  const openBook = openBookId ? BOOKS.find((b) => b.id === openBookId) : null
  // A deterministic general query for the current-web block, based on active filters.
  const webQuery = category
    ? `${CATEGORY_CHIP_LABELS[category] ?? category} personal finance books`
    : query.trim()
      ? `${query.trim()} personal finance books`
      : 'beginner personal finance books'

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-[var(--gfx-text)]">
          Books for Your Money Journey
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-[var(--gfx-muted)]">
          A short, curated reading list. GhostFinEx explains what each book covers and why it may
          fit your learning goal — what you read next is always your call.
        </p>
      </div>

      {/* Search + category chips */}
      <div className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search books by topic — e.g. budgeting, habits, investing basics…"
          aria-label="Search books by topic"
          className="w-full rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-4 py-2.5 text-sm text-[var(--gfx-text)] placeholder:text-[var(--gfx-faint)] outline-none transition-colors focus:border-[var(--gfx-accent-strong)]"
        />
        <div className="flex flex-wrap gap-2">
          <FilterChip active={category === ''} label="All books" onClick={() => setCategory('')} />
          {BOOK_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat}
              active={category === cat}
              label={CATEGORY_CHIP_LABELS[cat] ?? cat}
              onClick={() => setCategory(category === cat ? '' : cat)}
            />
          ))}
        </div>
      </div>

      {/* Results */}
      {books.length === 0 ? (
        <EmptyState
          title={`No curated books match ${query.trim() ? `“${query.trim()}”` : 'this filter'}`}
          description="GhostFinEx only lists books it can describe honestly — it won't invent a fallback suggestion."
          action={
            (query || category) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setCategory('')
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onOpen={() => setOpenBookId(book.id)}
              onCompare={() => toggleCompare(book.id)}
              comparing={compareIds.includes(book.id)}
              compareFull={compareIds.length >= MAX_COMPARE}
            />
          ))}
        </div>
      )}

      {compareBooks.length === 2 && (
        <BookComparisonBar books={compareBooks} onClose={() => setCompareIds([])} />
      )}

      {/* Opt-in current-web availability research (Tavily) */}
      <BookWebSources query={webQuery} editable />

      {openBook && (
        <BookDetailModal
          book={openBook}
          onClose={() => setOpenBookId(null)}
          lessons={lessons}
          onOpenLesson={(lessonId) => {
            setOpenBookId(null)
            onOpenLesson?.(lessonId)
          }}
        />
      )}
    </div>
  )
}

function FilterChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? 'rounded-full border border-[rgba(52,211,153,0.35)] bg-[var(--gfx-accent-soft)] px-3.5 py-1.5 text-xs font-medium text-[var(--gfx-accent)]'
          : 'rounded-full border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3.5 py-1.5 text-xs font-medium text-[var(--gfx-muted)] transition-colors hover:border-[var(--gfx-border-strong)] hover:text-[var(--gfx-text)]'
      }
    >
      {label}
    </button>
  )
}

function BookCard({ book, onOpen, onCompare, comparing, compareFull }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge tone="accent">{book.category}</Badge>
          <h4 className="mt-2 truncate text-base font-semibold text-[var(--gfx-text)]" title={book.title}>
            {book.title}
          </h4>
          <p className="truncate text-xs text-[var(--gfx-muted)]" title={book.author}>
            {book.author}
          </p>
        </div>
        <Badge>{book.level}</Badge>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--gfx-muted)]">
        {book.description}
      </p>

      <div className="mt-3 rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-accent-soft)] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gfx-accent)]">
          Why GhostFinEx suggests this
        </p>
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--gfx-muted)]">
          {book.whySuggested}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 pt-1">
        <Button size="sm" onClick={onOpen}>
          Learn More
        </Button>
        <Button
          size="sm"
          variant={comparing ? 'primary' : 'secondary'}
          onClick={onCompare}
          disabled={!comparing && compareFull}
          title={compareFull && !comparing ? 'You can compare two books at a time' : undefined}
        >
          {comparing ? '✓ Comparing' : '+ Compare'}
        </Button>
      </div>
    </Card>
  )
}
