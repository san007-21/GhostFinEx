/**
 * webSearch.ts — GhostFinEx web-search provider boundary.
 *
 * The ONLY file in the codebase that knows how to talk to a current-web
 * search provider. Everything else (Edge Functions, Ghost orchestration,
 * Smart Shopping) depends on the `searchWeb` signature, not on Tavily —
 * swapping providers means rewriting this file alone.
 *
 * Responsibilities kept OUT of this file:
 *   - authorization (callers verify the Supabase user first)
 *   - intent classification (which questions need web search at all)
 *   - financial math (never — finance.js stays the only money brain)
 *   - personal financial data (never sent to the provider)
 *
 * Provider: Tavily (https://api.tavily.com/search, Bearer auth).
 * Current API format verified live against the real endpoint:
 *   body: { query, search_depth, topic, max_results, include_answer,
 *           include_domains, exclude_domains, time_range }
 *   200 : { results: [{ title, url, content, score, raw_content }], answer? }
 *   401 : { detail: { error: "Invalid API key" } }
 *   432 : { detail: "Usage limit exceeded..." }  (Tavily's quota status)
 *   433 : { detail: "..." }                      (plan constraint)
 */

export const WEB_SEARCH_PROVIDER = 'tavily'

/** Provider-agnostic result shape consumed by the rest of the app. */
export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  score: number | null
  publishedDate: string | null
}

export interface WebSearchOutcome {
  query: string
  results: WebSearchResult[]
  /** Provider's own short answer, when requested. Not authoritative. */
  answer: string | null
  provider: string
  responseTimeMs: number | null
}

export class WebSearchError extends Error {
  status: number
  kind:
    | 'missing_key'
    | 'invalid_key'
    | 'rate_limit'
    | 'quota'
    | 'timeout'
    | 'network'
    | 'malformed'
    | 'empty'
    | 'provider_error'

  constructor(kind: WebSearchError['kind'], status: number, message: string) {
    super(message)
    this.name = 'WebSearchError'
    this.kind = kind
    this.status = status
  }
}

export interface SearchWebOptions {
  depth?: 'basic' | 'advanced'
  maxResults?: number
  includeAnswer?: boolean
  topic?: 'general' | 'news'
  /** Only include results from these domains. */
  includeDomains?: string[]
  /** Never include results from these domains. */
  excludeDomains?: string[]
  /** Freshness window, Tavily format. */
  timeRange?: 'day' | 'week' | 'month' | 'year'
  /** Abort after this many ms (default 15000). */
  timeoutMs?: number
  apiKey?: string
}

const DEFAULT_MAX_RESULTS = 5
const MAX_RESULTS_CAP = 10
const DEFAULT_TIMEOUT_MS = 15000

/** Map any thrown value to a safe WebSearchError (never leaks credentials). */
function toSearchError(err: unknown, status = 502): WebSearchError {
  if (err instanceof WebSearchError) return err
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new WebSearchError('timeout', 504, 'The search took too long to respond.')
  }
  return new WebSearchError('provider_error', status, 'The web search provider could not be reached.')
}

/** Parse one provider result row into the neutral shape. */
function normalizeResult(raw: unknown): WebSearchResult | null {
  if (typeof raw !== 'object' || raw === null) return null
  const row = raw as Record<string, unknown>
  const url = typeof row.url === 'string' ? row.url : ''
  const title = typeof row.title === 'string' ? row.title.trim() : ''
  if (!url || !title) return null
  const content = typeof row.content === 'string' ? row.content : ''
  const score = typeof row.score === 'number' ? row.score : null
  const publishedDate =
    typeof (row as { published_date?: unknown }).published_date === 'string'
      ? (row as { published_date: string }).published_date
      : null
  return {
    title: title.slice(0, 300),
    url,
    snippet: content.slice(0, 600),
    score,
    publishedDate,
  }
}

/**
 * Search the live web through Tavily. Pure transport + normalization:
 * callers own auth, intent, and any downstream interpretation.
 */
export async function searchWeb(
  query: string,
  options: SearchWebOptions = {},
): Promise<WebSearchOutcome> {
  const apiKey = options.apiKey ?? Deno.env.get('TAVILY_API_KEY')
  if (!apiKey) {
    // Fail closed and clearly: web features degrade, everything else works.
    throw new WebSearchError('missing_key', 503, 'Web search is not configured yet.')
  }

  const cleanQuery = query.trim().slice(0, 400)
  if (!cleanQuery) {
    throw new WebSearchError('empty', 400, 'Search query was empty.')
  }

  const maxResults = Math.min(
    Math.max(1, options.maxResults ?? DEFAULT_MAX_RESULTS),
    MAX_RESULTS_CAP,
  )
  const body = {
    query: cleanQuery,
    search_depth: options.depth ?? 'basic',
    topic: options.topic ?? 'general',
    max_results: maxResults,
    include_answer: options.includeAnswer === true ? 'basic' : false,
    include_raw_content: false,
    ...(options.includeDomains?.length ? { include_domains: options.includeDomains } : {}),
    ...(options.excludeDomains?.length ? { exclude_domains: options.excludeDomains } : {}),
    ...(options.timeRange ? { time_range: options.timeRange } : {}),
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const started = Date.now()

  let response: Response
  try {
    response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    throw toSearchError(err)
  }
  clearTimeout(timer)
  const responseTimeMs = Date.now() - started

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new WebSearchError('invalid_key', 503, 'Web search rejected its credentials.')
    }
    if (response.status === 429) {
      throw new WebSearchError('rate_limit', 429, 'Web search is busy — try again in a moment.')
    }
    if (response.status === 432 || response.status === 433) {
      throw new WebSearchError('quota', 503, 'The web search quota for this period is used up.')
    }
    throw new WebSearchError(
      'provider_error',
      502,
      `The web search provider returned an error (HTTP ${response.status}).`,
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new WebSearchError('malformed', 502, 'The web search response could not be read.')
  }

  if (typeof payload !== 'object' || payload === null || !Array.isArray((payload as { results?: unknown }).results)) {
    throw new WebSearchError('malformed', 502, 'The web search response had an unexpected shape.')
  }

  const rawResults = (payload as { results: unknown[] }).results
  const results = rawResults
    .map(normalizeResult)
    .filter((row): row is WebSearchResult => row !== null)

  const answer =
    typeof (payload as { answer?: unknown }).answer === 'string'
      ? (payload as { answer: string }).answer
      : null

  return {
    query: cleanQuery,
    results,
    answer,
    provider: WEB_SEARCH_PROVIDER,
    responseTimeMs,
  }
}
