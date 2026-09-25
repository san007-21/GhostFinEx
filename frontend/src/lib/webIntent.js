/**
 * webIntent.js — deterministic routing of Ask Ghost questions to data sources.
 *
 * Pure functions, no network, no AI: the same question always routes the
 * same way. Routing classes:
 *
 *   personal   — the user's own finances   → local state + finance.js (NO web)
 *   knowledge  — stable financial concepts → rule-based notes / RAG (NO web)
 *   web        — current products/prices   → Tavily (no personal data)
 *   combined   — personal affordability AND current price → both paths
 *   unknown    — nothing matched           → generic local insight (no web)
 *
 * Precedence (deliberate):
 *   1. Personal-data markers win first — privacy by default.
 *   2. A financial CONCEPT without freshness markers stays knowledge even if
 *      it contains "best/how" phrasing ("best way to budget" ≠ web search).
 *   3. Concept + freshness/price markers, or product+price phrasing → web.
 *   4. `explicitWeb` ("search the web for…") forces web from anywhere.
 */

const PERSONAL_PATTERNS = [
  /\bmy\b/, /\bour\b/, /\bi\s+(have|own|owe|spent|save|saved|earn)\b/i,
  /\b(balance|balances|budget|expenses?|income|salary|savings?|goals?|contributions?|subscriptions?|accounts?)\b/,
  /\bhow much (do|did|have)\s*i\b/i, /\bafford\w*\b/, /\bleft ?over\b/, /\bremaining\b/,
  /\bspent\b/, /\bspending\b/, /\bcan i\b/i,
]

/** Stable financial concepts — never a reason to hit the live web. */
const CONCEPT_RE = /\b(budget|budgeting|emergency fund|sinking fund|inflation|compound interest|interest|credit (score|utilization)|debt|net worth|cash flow|mutual fund|sip|diversif|risk|return|50\/30\/20|zero-based|apr|emi|utilization)\b/i

/** Freshness / commerce intent — the actual web-search triggers. */
const FRESH_RE = /\b(current|currently|latest|today|right now|live|this week|this month|2025|2026)\b/i
const COMMERCE_RE = /\b(price|prices|pricing|cost of|costs|deal|deals|discount|discounts|sale|promo|voucher|cheap(er)?|alternatives?|in stock|buy|purchase|store|retailer)\b/i
const SHOPPING_NOUN_RE = /\b(laptop|notebook|phone|headphones?|mouse|keyboard|monitor|desk|chair|backpack|calculator|textbook|tablet|printer|ssd|hard drive|router)\b/i

const EXPLICIT_WEB = [
  /\b(search (the )?web)\b/i, /\bgoogle\b/i, /\blook (it )?up online\b/i,
  /\bfind (me )?(online|on the (web|internet))\b/i, /\blive (price|search|web)\b/i,
]

const COMBINED_HINTS = [
  /\b(find|get|look ?up|check|search).{0,40}(price|cost|current).{0,60}(afford|budget|balance)\b/i,
  /\b(afford|worth buying|should i buy).{0,80}(current|latest|today|right now|price)\b/i,
  /\bprice.{0,60}afford\b/i,
]

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text))
}

function extractProduct(text) {
  const cleaned = text
    .replace(/^(hey|hi|hello|please|can you|could you|ghost[,\s]+)+/i, '')
    .replace(/\b(find|get|look ?up|check|search( the web)?( for)?|what is|what's|how much is|tell me)\b/gi, ' ')
    .replace(/\b(current|currently|latest|today's?|right now|the|a|an|price|prices|cost|of|for|to|me|my|this|good|great|nice)\b/gi, ' ')
    .replace(/[?!.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned || cleaned.length < 3 || /^[\d\s.,]+$/.test(cleaned)) return ''
  return cleaned.slice(0, 120)
}

/**
 * Focus a natural-language request into a concise product/price query
 * (Phase 9): strips politeness and personal context — the provider gets an
 * internet-shaped query, never the user's sentence or financial details.
 */
export function toSearchQuery(question) {
  let product = extractProduct(question)
  const wantsDeals = /\b(deal|deals|discount|promo|sale)\b/i.test(question)
  const wantsAlternatives = /\b(alternatives?|cheaper|instead)\b/i.test(question)
  // Don't duplicate intent words the product phrase already carries.
  if (wantsDeals) product = product.replace(/\bdeals?\b/gi, ' ').replace(/\s+/g, ' ').trim()
  if (wantsAlternatives) product = product.replace(/\b(alternatives?|cheaper)\b/gi, ' ').replace(/\s+/g, ' ').trim()
  const parts = [product]
  if (wantsAlternatives) parts.push('alternatives prices')
  if (wantsDeals) parts.push('deals')
  return parts.filter(Boolean).join(' ').trim().slice(0, 200)
}

/**
 * Classify a question. Returns { type, needsWeb, usePersonalData, searchQuery }.
 */
export function classifyIntent(question) {
  const text = String(question ?? '').trim()
  if (!text) {
    return { type: 'unknown', needsWeb: false, usePersonalData: false, searchQuery: '' }
  }

  const personal = matchesAny(text, PERSONAL_PATTERNS)
  const concept = CONCEPT_RE.test(text)
  const fresh = FRESH_RE.test(text)
  const commerce = COMMERCE_RE.test(text)
  const shoppingNoun = SHOPPING_NOUN_RE.test(text)
  const explicitWeb = matchesAny(text, EXPLICIT_WEB)
  const combined = matchesAny(text, COMBINED_HINTS)

  // 1. Personal + commerce/freshness → the flagship combined flow.
  if (personal && (commerce || fresh)) {
    const wantsWeb = combined || explicitWeb || (shoppingNoun && fresh)
    return {
      type: combined ? 'combined' : 'personal',
      needsWeb: wantsWeb,
      usePersonalData: true,
      searchQuery: wantsWeb ? toSearchQuery(text) : '',
    }
  }

  // 2. Concept questions stay knowledge unless freshness/deals are explicit.
  if (concept && !fresh && !/\bdeals?\b/i.test(text) && !explicitWeb) {
    return { type: 'knowledge', needsWeb: false, usePersonalData: false, searchQuery: '' }
  }

  // 3. Explicit web request wins from anywhere.
  if (explicitWeb) {
    return { type: 'web', needsWeb: true, usePersonalData: false, searchQuery: toSearchQuery(text) }
  }

  // 4. Current-web product/price question without personal markers.
  if ((commerce || fresh) && shoppingNoun && !personal) {
    return { type: 'web', needsWeb: true, usePersonalData: false, searchQuery: toSearchQuery(text) }
  }
  if (commerce && !personal) {
    return { type: 'web', needsWeb: true, usePersonalData: false, searchQuery: toSearchQuery(text) }
  }

  // 5. Personal-only → deterministic local answers.
  if (personal) {
    return { type: 'personal', needsWeb: false, usePersonalData: true, searchQuery: '' }
  }

  return {
    type: concept ? 'knowledge' : 'unknown',
    needsWeb: false,
    usePersonalData: false,
    searchQuery: '',
  }
}
