import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import { Alert, Badge, Button, Disclaimer, EmptyState, StatCard } from '../components/ui/Primitives.jsx'
import { formatCurrency } from '../lib/format'
import { roundMoney } from '../lib/finance'
import { searchWeb } from '../lib/webSearch'
import { priceSignal, describePriceSignal, domainOf } from '../lib/priceSignals'
import { stashPriceSuggestion } from '../lib/priceHandoff'
import { IconTag } from '../components/ui/icons.jsx'

function Stars({ rating }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Rated ${rating} out of 5`}>
      <span aria-hidden="true" className="text-[var(--gfx-warn)]">
        {'★'.repeat(Math.round(rating))}
        <span className="text-[var(--gfx-surface-3)]">{'★'.repeat(5 - Math.round(rating))}</span>
      </span>
      <span className="tabular text-xs text-[var(--gfx-muted)]">{rating.toFixed(1)}</span>
    </span>
  )
}

export default function ShoppingView({ finance, onNavigate }) {
  const { products } = finance
  const [sortBy, setSortBy] = useState('price')

  /* ---- live web search (Tavily via the web-search Edge Function) ---- */
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [webResults, setWebResults] = useState(null) // null = not searched yet
  const [webError, setWebError] = useState('')

  const runSearch = async (event) => {
    event?.preventDefault?.()
    const text = query.trim()
    if (!text || searching) return
    setSearching(true)
    setWebError('')
    const { data, error } = await searchWeb(text)
    setSearching(false)
    if (error) {
      setWebError(error)
      setWebResults(null)
      return
    }
    setWebResults(data)
  }

  const webSignal = useMemo(() => (webResults ? priceSignal(webResults.results) : null), [webResults])

  // Comparison math is deterministic over the demo products.
  const rows = useMemo(() => {
    const withMath = products.map((product) => {
      const saving = roundMoney(product.previousPrice - product.price)
      const savingPercent = product.previousPrice > 0 ? saving / product.previousPrice : 0
      return { ...product, saving, savingPercent }
    })
    const sorters = {
      price: (a, b) => a.price - b.price,
      savings: (a, b) => b.saving - a.saving,
      rating: (a, b) => b.rating - a.rating,
      delivery: (a, b) => a.deliveryDays - b.deliveryDays,
    }
    return withMath.sort(sorters[sortBy] ?? sorters.price)
  }, [products, sortBy])

  const cheapest = rows.reduce((min, r) => (r.price < min.price ? r : min), rows[0])
  const bestSaving = rows.reduce((max, r) => (r.saving > max.saving ? r : max), rows[0])
  const fastest = rows.reduce((min, r) => (r.deliveryDays < min.deliveryDays ? r : min), rows[0])

  return (
    <div>
      <PageHeader
        title="Smart shopping"
        subtitle="A future-ready comparison interface. The products below are demo data so you can see how comparisons will work."
      >
        <select
          className="date-input !w-auto"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort products by"
        >
          <option value="price">Sort: lowest price</option>
          <option value="savings">Sort: biggest saving</option>
          <option value="rating">Sort: highest rating</option>
          <option value="delivery">Sort: fastest delivery</option>
        </select>
      </PageHeader>

      <Card title="Search the current web" subtitle="Live product and price research — clearly separate from the demo comparison below" className="mb-6">
        <form onSubmit={runSearch} className="flex flex-wrap items-end gap-2">
          <label className="min-w-56 flex-1">
            <span className="sr-only">Search the web for a product or price</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. wireless headphones student deal"
              className="w-full rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-sm text-[var(--gfx-text)] placeholder:text-[var(--gfx-faint)] focus:border-[var(--gfx-accent-strong)] focus:outline-none transition-colors"
            />
          </label>
          <Button type="submit" disabled={!query.trim() || searching}>
            {searching ? 'Searching…' : 'Search the web'}
          </Button>
        </form>

        {searching && (
          <div className="mt-4 space-y-2" aria-live="polite" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="gfx-skeleton h-4 rounded" style={{ width: `${90 - i * 18}%` }} />
            ))}
          </div>
        )}

        {!searching && webError && (
          <div className="mt-4">
            <Alert tone="warn" title="Web search unavailable">
              {webError} The demo comparison below and all of your budgeting tools keep working.
            </Alert>
          </div>
        )}

        {!searching && !webError && webResults && webResults.results.length === 0 && (
          <div className="mt-4">
            <EmptyState
              icon={null}
              title="No results found"
              description="The web search returned nothing useful for that query. Try naming the product more specifically."
            />
          </div>
        )}

        {!searching && !webError && webResults && webResults.results.length > 0 && (
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="info">Current web research</Badge>
              <span className="text-xs text-[var(--gfx-faint)]">
                {webResults.cached ? 'cached from a recent search · ' : ''}
                {webResults.results.length} sources
              </span>
            </div>
            {webSignal && (
              <p className="mb-3 rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-2 text-sm text-[var(--gfx-muted)]">
                <strong className="text-[var(--gfx-text)]">Price signal:</strong> {describePriceSignal(webSignal)}
                <span className="block text-xs text-[var(--gfx-faint)]">Extracted from source snippets — may be outdated or regional. Verify before deciding.</span>
              </p>
            )}
            <ul className="space-y-2">
              {webResults.results.slice(0, 5).map((result) => (
                <li key={result.url} className="rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--gfx-accent)] underline-offset-2 hover:underline"
                    >
                      {result.title}
                    </a>
                    <span className="text-xs text-[var(--gfx-faint)]">{domainOf(result.url)}</span>
                  </div>
                  {result.snippet && <p className="mt-1 line-clamp-2 text-xs text-[var(--gfx-muted)]">{result.snippet}</p>}
                </li>
              ))}
            </ul>
            {webSignal?.state === 'single' && Number.isFinite(webSignal.price) && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    stashPriceSuggestion({ price: webSignal.price, label: webResults.query, sourceDomain: webSignal.sourceDomain, sourceUrl: webSignal.sourceUrl })
                    onNavigate('afford')
                  }}
                >
                  Run affordability on ~{formatCurrency(webSignal.price, { compact: true })} →
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="mb-4">
        <Alert tone="info" title="Demo products — not live search results">
          No store or price API is connected in this phase. Names, prices, ratings, and delivery
          estimates below are illustrative examples. The search above is live; this comparison is
          fixed demo data.
        </Alert>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={IconTag}
          title="No products to compare"
          description="Demo products will appear here, compared on price, rating, delivery, and savings against previous prices."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Lowest price" value={formatCurrency(cheapest.price, { compact: true })} sub={cheapest.name} tone="accent" />
            <StatCard label="Biggest saving" value={formatCurrency(bestSaving.saving, { compact: true })} sub={`${bestSaving.name} · ${Math.round(bestSaving.savingPercent * 100)}% off`} tone="info" />
            <StatCard label="Fastest delivery" value={`${fastest.deliveryDays} days`} sub={fastest.name} />
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            {rows.map((product) => {
              const isCheapest = product.id === cheapest.id
              const hasSaving = product.saving > 0
              return (
                <Card
                  key={product.id}
                  as="article"
                  className={`transition-colors hover:border-[var(--gfx-border-strong)] ${isCheapest ? 'ring-1 ring-[rgba(52,211,153,0.4)]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge tone="neutral">{product.store}</Badge>
                    {isCheapest && <Badge tone="accent">Lowest price</Badge>}
                    {hasSaving && !isCheapest && <Badge tone="info">{Math.round(product.savingPercent * 100)}% off</Badge>}
                  </div>
                  <h3 className="mt-3 font-medium text-[var(--gfx-text)]">{product.name}</h3>
                  <div className="mt-1">
                    <Stars rating={product.rating} />
                  </div>
                  <div className="tabular mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-[var(--gfx-text)]">{formatCurrency(product.price)}</span>
                    {hasSaving && (
                      <span className="text-sm text-[var(--gfx-faint)] line-through">{formatCurrency(product.previousPrice, { compact: true })}</span>
                    )}
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--gfx-muted)]">Delivery</dt>
                      <dd className="text-[var(--gfx-text)]">{product.deliveryDays} {product.deliveryDays === 1 ? 'day' : 'days'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--gfx-muted)]">Saving vs previous</dt>
                      <dd className={hasSaving ? 'text-[var(--gfx-accent)]' : 'text-[var(--gfx-faint)]'}>
                        {hasSaving ? formatCurrency(product.saving) : '—'}
                      </dd>
                    </div>
                  </dl>
                  {product.note && <p className="mt-3 text-xs text-[var(--gfx-faint)]">{product.note}</p>}
                  <div className="mt-4 border-t border-[var(--gfx-border)] pt-3">
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => onNavigate('afford')}>
                      Can I afford this?
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Card title="Student deals to check" subtitle="Static demo list — not live offers" className="mb-6">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {finance.deals.map((deal) => (
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

      <Disclaimer>
        Nothing here is presented as live store data. The comparison, sorting, and savings math is
        real and deterministic — only the product data is mock, clearly labeled as such.
      </Disclaimer>
    </div>
  )
}
