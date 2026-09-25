/**
 * webSearch.js — frontend client for the web-search Edge Function (Tavily).
 *
 * SECURITY: the TAVILY_API_KEY never touches this file, the bundle, or the
 * browser. This module only invokes the Supabase Edge Function, which reads
 * the key from server-side secrets. Queries are plain search strings — no
 * user identity or financial data is ever attached.
 *
 * Privacy: Tavily receives only the search query. Private financial data
 * stays in Supabase/finance.js (enforced by the function's validation).
 *
 * Error handling: every failure returns { data: null, error } with a
 * user-facing message. Nothing silently swallowed. A small per-session
 * in-memory cache prevents duplicate identical searches in one interaction.
 */

import { supabase } from './supabase'

const MAX_QUERY_LENGTH = 300
const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_MAX = 30

const cache = new Map()

function cacheGet(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    cache.delete(cache.keys().next().value)
  }
  cache.set(key, { at: Date.now(), value })
}

function message(error, fallback) {
  return error instanceof Error ? error.message : (error?.message ?? fallback)
}

/** Map Edge Function status codes to honest, actionable user messages. */
function friendlyEdgeError(status, edgeMessage, kind) {
  switch (kind || status) {
    case 'missing_key':
    case 503:
      return edgeMessage ?? 'Web search is not configured yet. Everything else keeps working.'
    case 429:
    case 'rate_limit':
      return 'Web search is busy right now — try again in a moment.'
    case 'quota':
      return 'The web search quota for this period is used up. Try again later.'
    case 401:
      return 'Sign in to search the web — current-price search is available to signed-in students.'
    case 504:
    case 'timeout':
      return 'The search took too long — please try again.'
    default:
      return edgeMessage ?? 'Web search could not be reached right now — please try again.'
  }
}

/**
 * Search the current web for a product/price query.
 * Returns { data, error } where data is
 * { query, results: [{ title, url, snippet, score, publishedDate }],
 *   answer, provider, searchedAt, cached }.
 */
export async function searchWeb(query, { signal } = {}) {
  const text = typeof query === 'string' ? query.trim() : ''
  if (!text) return { data: null, error: 'Enter something to search for.' }
  if (text.length > MAX_QUERY_LENGTH) {
    return { data: null, error: `Search queries are limited to ${MAX_QUERY_LENGTH} characters.` }
  }
  if (!supabase) {
    return { data: null, error: 'Web search needs a Supabase connection, which this build does not have.' }
  }

  const key = text.toLowerCase()
  const cached = cacheGet(key)
  if (cached) return { data: { ...cached, cached: true }, error: null }

  try {
    const { data, error, status } = await supabase.functions.invoke(
      'web-search',
      { body: { query: text }, ...(signal ? { signal } : {}) },
    )
    if (error) {
      return { data: null, error: friendlyEdgeError(status, message(error, null), error?.kind ?? data?.kind) }
    }
    const results = Array.isArray(data?.results)
      ? data.results
          .filter((r) => typeof r?.url === 'string' && typeof r?.title === 'string')
          .map((r) => ({
            title: String(r.title).slice(0, 300),
            url: r.url,
            snippet: typeof r.snippet === 'string' ? r.snippet.slice(0, 600) : '',
            score: typeof r.score === 'number' ? r.score : null,
            publishedDate: typeof r.publishedDate === 'string' ? r.publishedDate : null,
          }))
      : []
    const payload = {
      query: data?.query ?? text,
      results,
      answer: typeof data?.answer === 'string' ? data.answer : null,
      provider: data?.provider ?? null,
      searchedAt: data?.searchedAt ?? new Date().toISOString(),
      cached: Boolean(data?.cached),
    }
    if (results.length > 0) cacheSet(key, payload)
    return { data: payload, error: null }
  } catch (err) {
    if (err?.name === 'AbortError') return { data: null, error: 'Search cancelled.' }
    return { data: null, error: message(err, 'Could not reach web search — check your connection and try again.') }
  }
}

/** Clear the in-session search cache (used by tests). */
export function clearWebSearchCache() {
  cache.clear()
}
