/**
 * BookComparisonBar — qualitative side-by-side of two curated books.
 *
 * Deliberately NO numerical scores and no "best book" verdict: the table
 * describes differences (topic focus, beginner-friendliness, practical vs
 * theoretical, mapped learning goal) so the user can decide which fits how
 * they like to learn.
 */

import Card from '../ui/Card.jsx'
import { Badge, Button } from '../ui/Primitives.jsx'

const ROWS = [
  { key: 'topics', label: 'Main topics', render: (book) => book.topics.join(' · ') },
  {
    key: 'level',
    label: 'Beginner friendliness',
    render: (book) => (book.level === 'Beginner' ? 'Assumes no prior knowledge' : 'Some basics helpful'),
  },
  {
    key: 'practicality',
    label: 'Practical vs conceptual',
    render: (book) =>
      book.practicality === 'practical'
        ? 'Step-by-step, action-oriented'
        : book.practicality === 'conceptual'
          ? 'Ideas and frameworks first'
          : 'Mix of stories and practical framing',
  },
  { key: 'category', label: 'Learning goal it maps to', render: (book) => book.category },
]

export default function BookComparisonBar({ books, onClose }) {
  if (!Array.isArray(books) || books.length !== 2) return null
  const [a, b] = books

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[var(--gfx-text)]">Side-by-side</h4>
          <p className="mt-0.5 text-xs text-[var(--gfx-muted)]">
            Two angles on the same goal — neither is "better"; pick the angle that fits how you
            like to learn.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="w-32 pb-2 pr-3 align-bottom text-[11px] font-medium uppercase tracking-wider text-[var(--gfx-faint)]">
                Trait
              </th>
              <th className="pb-2 pr-3 align-bottom">
                <span className="block max-w-[220px] truncate font-semibold text-[var(--gfx-text)]">
                  {a.title}
                </span>
              </th>
              <th className="pb-2 align-bottom">
                <span className="block max-w-[220px] truncate font-semibold text-[var(--gfx-text)]">
                  {b.title}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="text-[var(--gfx-muted)]">
            {ROWS.map((row) => (
              <tr key={row.key} className="border-t border-[var(--gfx-border)]">
                <td className="py-2.5 pr-3 align-top text-xs text-[var(--gfx-faint)]">{row.label}</td>
                <td className="py-2.5 pr-3 align-top">{row.render(a)}</td>
                <td className="py-2.5 align-top">{row.render(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="accent">{a.category}</Badge>
        <Badge tone="accent">{b.category}</Badge>
      </div>
    </Card>
  )
}
