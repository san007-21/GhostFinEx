/**
 * web-search — GhostFinEx current-web search endpoint (Tavily).
 *
 * The only server-side caller of _shared/webSearch.ts. Responsibilities:
 *   1. Require an authenticated Supabase user (never an anonymous endpoint).
 *   2. Validate the query (length, intent keyword guard).
 *   3. Call the provider once, with a short-lived in-memory cache so repeated
 *      identical questions in one session don't burn quota.
 *   4. Return normalized results with safe errors. The TAVILY_API_KEY lives
 *      only in Deno.env — never in code, logs, or responses.
 *
 * PRIVACY CONTRACT: this function receives a search query and nothing else.
 * It has no database client and no access to user financial records, so it
 * is structurally incapable of leaking them to the provider.
 *
 * Isolation: touches NO tables — read/write isolation by construction.
 */
// @ts-nocheck — Deno Edge Function; typechecked by `supabase functions` tooling
import { searchWeb, WebSearchError } from '../_shared/webSearch.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_QUERY_LENGTH = 300
const CACHE_TTL_MS = 10 * 60 * 1000 // short-lived: freshness without hammering quota
const CACHE_MAX_ENTRIES = 40

// One cache per isolate. Key = provider options + query (lowercased).
const cache = new Map()

function cacheKey(payload) {
  return JSON.stringify([
    payload.query.trim().toLowerCase(),
    payload.depth,
    payload.maxResults,
    payload.topic,
    payload.timeRange ?? null,
    [...(payload.includeDomains ?? [])].sort(),
    [...(payload.excludeDomains ?? [])].sort(),
  ])
}

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
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    cache.delete(oldest)
  }
  cache.set(key, { at: Date.now(), value })
}

/** Guard against treating the search endpoint as a general web proxy. */
function hasDisallowedIntent(query) {
  return /(my|our)\s+(balance|expenses?|income|savings|budget|account|goal|subscription)/i.test(query)
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // 1. Authentication — same boundary as ghost-ai. No anon/public access.
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Missing bearer token' }, 401)
  const { createClient } = await import('jsr:@supabase/supabase-js@2')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_ANON_KEY'),
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return json({ error: 'Sign in to search the web.' }, 401)

  // 2. Validate the request.
  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }
  const query = typeof payload?.query === 'string' ? payload.query.trim() : ''
  if (!query) return json({ error: 'Enter something to search for.' }, 400)
  if (query.length > MAX_QUERY_LENGTH) {
    return json({ error: `Search queries are limited to ${MAX_QUERY_LENGTH} characters.` }, 400)
  }
  if (hasDisallowedIntent(query)) {
    return json(
      { error: 'Use Ghost on the dashboard for questions about your own finances — web search is for public product and price information.' },
      400,
    )
  }

  // 3. Short-lived cache (per isolate).
  const key = cacheKey({ ...payload, query })
  const cached = cacheGet(key)
  if (cached) return json({ ...cached, cached: true })

  // 4. Search. WebSearchError.kind drives the HTTP status; message is safe.
  const options = {
    depth: payload.depth === 'advanced' ? 'advanced' : 'basic',
    maxResults: typeof payload.maxResults === 'number' ? payload.maxResults : 5,
    includeAnswer: payload.includeAnswer === true,
    includeDomains: Array.isArray(payload.includeDomains) ? payload.includeDomains.filter((d) => typeof d === 'string') : undefined,
    excludeDomains: Array.isArray(payload.excludeDomains) ? payload.excludeDomains.filter((d) => typeof d === 'string') : undefined,
    timeRange: ['day', 'week', 'month', 'year'].includes(payload.timeRange) ? payload.timeRange : undefined,
  }

  try {
    const outcome = await searchWeb(query, options)
    const responseBody = {
      query: outcome.query,
      results: outcome.results,
      answer: outcome.answer,
      provider: outcome.provider,
      responseTimeMs: outcome.responseTimeMs,
      searchedAt: new Date().toISOString(),
    }
    if (outcome.results.length > 0) cacheSet(key, responseBody)
    return json(responseBody)
  } catch (err) {
    if (err instanceof WebSearchError) {
      // Log only kind + status — never the key, never full provider bodies.
      console.error(`[web-search] ${err.kind} (${err.status})`)
      return json({ error: err.message, kind: err.kind }, err.status)
    }
    console.error('[web-search] unexpected error')
    return json({ error: 'Web search failed unexpectedly.' }, 502)
  }
})
