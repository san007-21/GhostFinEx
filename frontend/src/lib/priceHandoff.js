/**
 * priceHandoff.js — carries a web-detected price from Smart Shopping / Ghost
 * into the Can-I-Afford-This view ("find current price, then afford it").
 *
 * UI-only convenience: sessionStorage (per-tab, dies with the tab), holding
 * a *suggestion* to prefill a form. The affordability calculation itself
 * always recomputes deterministically in finance.js from the final form
 * value — this storage is never a financial source of truth.
 */

const KEY = 'ghostfinex.ui.priceHandoff'

/** Store a price suggestion. Returns true when it was storable. */
export function stashPriceSuggestion({ price, label, sourceDomain, sourceUrl } = {}) {
  const value = Number(price)
  if (!Number.isFinite(value) || value <= 0) return false
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        price: value,
        label: typeof label === 'string' ? label.slice(0, 120) : '',
        sourceDomain: typeof sourceDomain === 'string' ? sourceDomain.slice(0, 120) : '',
        sourceUrl: typeof sourceUrl === 'string' ? sourceUrl.slice(0, 300) : '',
        at: Date.now(),
      }),
    )
    return true
  } catch {
    return false // storage unavailable — prefill silently skipped, nothing breaks
  }
}

/** Consume the suggestion (read-once). Returns null when absent/stale. */
export function takePriceSuggestion() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    sessionStorage.removeItem(KEY)
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.price !== 'number' || Date.now() - (parsed.at ?? 0) > 30 * 60 * 1000) return null
    return {
      price: parsed.price,
      label: parsed.label ?? '',
      sourceDomain: parsed.sourceDomain ?? '',
      sourceUrl: parsed.sourceUrl ?? '',
    }
  } catch {
    return null
  }
}

/** Peek without consuming (lets AffordView avoid pointless renders). */
export function hasPriceSuggestion() {
  try {
    return sessionStorage.getItem(KEY) !== null
  } catch {
    return false
  }
}
