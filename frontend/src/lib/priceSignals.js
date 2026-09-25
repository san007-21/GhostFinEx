/**
 * priceSignals.js — deterministic price extraction from web search results.
 *
 * Pure functions: same results in, same signal out. These heuristics exist
 * to surface a *starting point* for the user — never to fabricate. When
 * prices conflict or look unreliable, the signal says so explicitly and the
 * UI preserves the uncertainty instead of silently picking one.
 *
 * No AI involved; finance.js stays the only money-brain for calculations.
 */

const CURRENCY_RE = /(?:r\s?|zar\s?)\s?(\d[\d,]*(?:\.\d{1,2})?)/gi
const AMBIGUOUS_RE = /(?:\$\s?\d|\b€\d|\b£\d|\b₹\s?\d|\busd\b)/i

function parseAmount(value) {
  const num = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(num) && num > 0 ? num : null
}

/** Domain of a URL, or '' when unusable. */
export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Extract candidate prices from one result (title + snippet).
 * Returns [{ amount, source: 'title' | 'snippet', currency: 'ZAR' | 'unknown' }].
 */
export function extractPrices(result) {
  const out = []
  if (!result) return out
  const currency = AMBIGUOUS_RE.test(`${result.title} ${result.snippet}`) ? 'unknown' : 'ZAR'
  for (const [text, source] of [[result.title, 'title'], [result.snippet, 'snippet']]) {
    if (typeof text !== 'string') continue
    CURRENCY_RE.lastIndex = 0
    let match
    while ((match = CURRENCY_RE.exec(text)) !== null) {
      const amount = parseAmount(match[1])
      if (amount !== null) out.push({ amount, source, currency })
      if (out.length >= 6) return out
    }
  }
  return out
}

/**
 * Build a price signal from a result set.
 *
 * Returns one of:
 *   { state: 'none' }                                  — nothing found
 *   { state: 'unavailable' }                           — sources say "out of stock" etc.
 *   { state: 'single', price, currency, sourceTitle, sourceDomain, sourceUrl }
 *   { state: 'multiple', candidates: [{ amount, count, sourceTitle, sourceDomain, sourceUrl, currency }] }
 *   { state: 'conflict', note }                        — currency can't be trusted (e.g. $ mixed in)
 *
 * `unavailable` beats `single` when stock language outranks prices, so a
 * sold-out product never yields a confident price.
 */
export function priceSignal(results) {
  const list = Array.isArray(results) ? results : []
  if (list.length === 0) return { state: 'none' }

  const outOfStock = list.filter((r) =>
    /\b(out of stock|sold out|unavailable|no longer available|discontinued)\b/i.test(`${r.title} ${r.snippet}`),
  )

  const candidates = new Map()
  for (const result of list) {
    for (const price of extractPrices(result)) {
      if (price.currency !== 'ZAR') continue
      const key = price.amount
      const existing = candidates.get(key) ?? {
        amount: price.amount,
        count: 0,
        sourceTitle: result.title,
        sourceDomain: domainOf(result.url),
        sourceUrl: result.url,
      }
      existing.count += 1
      if (price.source === 'title' && existing.sourceTitle !== result.title) {
        existing.sourceTitle = result.title
        existing.sourceDomain = domainOf(result.url)
        existing.sourceUrl = result.url
      }
      candidates.set(key, existing)
    }
  }

  const sorted = [...candidates.values()].sort((a, b) => b.count - a.count || a.amount - b.amount)

  if (sorted.length === 0) {
    if (outOfStock.length > 0) {
      return { state: 'unavailable', sourceTitle: outOfStock[0].title, sourceDomain: domainOf(outOfStock[0].url), sourceUrl: outOfStock[0].url }
    }
    return { state: 'none' }
  }
  if (outOfStock.length >= sorted[0].count) {
    return { state: 'unavailable', sourceTitle: outOfStock[0].title, sourceDomain: domainOf(outOfStock[0].url), sourceUrl: outOfStock[0].url }
  }
  if (sorted.length === 1) {
    // `price` is the canonical consumer field (Ghost, Shopping, handoff);
    // `amount` kept for symmetry with candidates.
    return { state: 'single', price: sorted[0].amount, amount: sorted[0].amount, currency: 'ZAR', sourceTitle: sorted[0].sourceTitle, sourceDomain: sorted[0].sourceDomain, sourceUrl: sorted[0].sourceUrl }
  }
  return { state: 'multiple', candidates: sorted.slice(0, 5) }
}

/** One-line human summary of a signal, used by Ghost and Shopping UI. */
export function describePriceSignal(signal) {
  switch (signal?.state) {
    case 'single':
      return `Around R ${(signal.price ?? signal.amount).toLocaleString('en-ZA')} — from ${signal.sourceDomain || signal.sourceTitle}.`
    case 'multiple':
      return `Prices vary by source: ${signal.candidates.map((c) => `R ${c.amount.toLocaleString('en-ZA')}`).join(', ')}.`
    case 'unavailable':
      return 'Sources indicate it may be out of stock or unavailable.'
    case 'conflict':
      return signal.note
    case 'none':
    default:
      return 'Price not available from the retrieved source.'
  }
}
