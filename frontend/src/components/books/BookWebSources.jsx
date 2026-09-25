/**
 * BookWebSources.jsx — on-demand current-web research for book information.
 *
 * Uses the existing Tavily-backed `web-search` Edge Function via the existing
 * `searchWeb` client. Nothing is fabricated: what the search returns is what
 * is shown (title, domain, link, snippet). If the function isn't deployed or
 * the key is missing, the block shows a calm explanation and the rest of the
 * Learning Hub keeps working.
 *
 * Only a search string leaves the app — never any GhostFinEx financial data.
 *
 * Two modes:
 *   editable  — an input the user can retype (Books section, general query)
 *   fixed     — a single button for one pre-set query (book detail modal)
 */

import { useState } from 'react'
import { searchWeb } from '../../lib/webSearch.js'
import { Button } from '../ui/Primitives.jsx'

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Props:
 *   query        — the pre-set search text (BooksSection derives it from the
 *                  active filters, so re-rendering with a new query naturally
 *                  updates the draft — no effect needed)
 *   editable     — show an editable search input (Books section) vs a button
 *                  for the fixed query (book detail modal)
 *   searchLabel  — label for the fixed-query button
 */
export default function BookWebSources({ query, editable = false, searchLabel = 'Search' }) {
  const [queryDraft, setQueryDraft] = useState(query)
  const [state, setState] = useState('idle') // idle | loading | ready | error
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  // The section re-derives its query from the active filters; if the user has
  // not typed a custom search yet, follow the prop (no effect, no setState).
  const effectiveQuery = (queryDraft || query).trim()

  function resetQuery() {
    setQueryDraft('')
    setState('idle')
    setResults([])
    setError('')
  }

  async function runSearch() {
    if (!effectiveQuery) return
    setState('loading')
    setError('')
    const { data, error: searchError } = await searchWeb(effectiveQuery)
    if (searchError) {
      setResults([])
      setError(String(searchError))
      setState('error')
      return
    }
    setResults(Array.isArray(data?.results) ? data.results : [])
    setState('ready')
  }

  if (state === 'idle') {
    return (
      <div className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
        <p className="text-sm font-medium text-[var(--gfx-text)]">
          Looking for what's available right now?
        </p>
        <p className="mt-1 text-xs text-[var(--gfx-muted)]">
          GhostFinEx can search the live web for current availability, formats, or recent
          editions — sources will be shown with each result. Only your search text is sent;
          none of your GhostFinEx data.
        </p>
        {editable ? (
          <div className="mt-3 flex gap-2">
            <input
              type="search"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runSearch()
              }}
              aria-label="Search the web for book information"
              className="min-w-0 flex-1 rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-sm text-[var(--gfx-text)] placeholder:text-[var(--gfx-faint)] outline-none transition-colors focus:border-[var(--gfx-accent-strong)]"
            />
            <Button size="sm" onClick={runSearch} disabled={!queryDraft.trim()}>
              {searchLabel}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" className="mt-3" onClick={runSearch}>
            {searchLabel}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--gfx-text)]">
          Current web research
          <span className="ml-2 rounded-full border border-[rgba(96,165,250,0.35)] bg-[var(--gfx-info-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--gfx-info)]">
            web
          </span>
        </p>
        <button
          type="button"
          onClick={resetQuery}
          className="text-xs text-[var(--gfx-faint)] transition hover:text-[var(--gfx-muted)]"
        >
          Reset
        </button>
      </div>

      {editable && (
        <div className="mt-3 flex gap-2">
          <input
            type="search"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') runSearch()
            }}
            aria-label="Search the web for book information"
            className="min-w-0 flex-1 rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-sm text-[var(--gfx-text)] placeholder:text-[var(--gfx-faint)] outline-none transition-colors focus:border-[var(--gfx-accent-strong)]"
          />
          <Button size="sm" onClick={runSearch} disabled={state === 'loading' || !queryDraft.trim()}>
            {state === 'loading' ? 'Searching…' : 'Search'}
          </Button>
        </div>
      )}

      {state === 'loading' && (
        <ul className="mt-4 space-y-3" aria-live="polite" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="gfx-skeleton h-14 rounded-xl" />
          ))}
        </ul>
      )}

      {state === 'error' && (
        <div className="mt-4 rounded-xl border border-[rgba(251,191,36,0.35)] bg-[var(--gfx-warn-soft)] p-3.5">
          <p className="text-xs font-medium text-[var(--gfx-warn)]">
            Current-web search unavailable
          </p>
          <p className="mt-1 text-xs text-[var(--gfx-muted)]">{error}</p>
          <p className="mt-1 text-xs text-[var(--gfx-faint)]">
            The curated list still works — it doesn't depend on the live web.
          </p>
        </div>
      )}

      {state === 'ready' && results.length === 0 && (
        <p className="mt-4 text-xs text-[var(--gfx-muted)]">
          No current web results for that search. Try a different phrasing — or use the curated
          list, which stays available offline.
        </p>
      )}

      {state === 'ready' && results.length > 0 && (
        <ul className="mt-4 space-y-3">
          {results.map((result, index) => (
            <li
              key={result.url ?? index}
              className="rounded-xl bg-[var(--gfx-surface-3)] p-3.5 transition-colors hover:border-[var(--gfx-border-strong)]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm font-medium text-[var(--gfx-text)] underline decoration-[var(--gfx-border-strong)] underline-offset-2 transition hover:decoration-[var(--gfx-muted)]"
                  title={result.title}
                >
                  {result.title}
                </a>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--gfx-faint)]">
                  {domainOf(result.url)}
                </span>
              </div>
              {result.snippet && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--gfx-muted)]">
                  {result.snippet}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
