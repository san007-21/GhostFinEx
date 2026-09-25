/**
 * rag-embed — GhostFinEx RAG FOUNDATION (query-side embedding service).
 *
 * Responsibility: turn a short query string into a gte-small embedding
 * (384-dim, normalized) using Supabase's built-in AI inference — no external
 * API, no keys beyond the platform-provided service role that stays on the
 * server. The function is stateless: it touches NO database tables, so it
 * cannot read or write financial records of any kind. Retrieval itself
 * happens afterwards in Postgres via match_financial_chunks (SECURITY
 * INVOKER — caller's RLS applies).
 *
 * Security: requires a valid Supabase user JWT (aligned with the match RPC,
 * which is granted to `authenticated` only). Demo/guest users cannot invoke
 * it — the future Ghost UI will handle that case.
 *
 * Isolation: no financial CRUD, no user data, no writes.
 */
// @ts-nocheck — Deno Edge Function; typechecked by `supabase functions` tooling
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { generateEmbedding } from '../_shared/embedding.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS_HEADERS })
  }

  // Require an authenticated Supabase session (mirrors the match RPC grant).
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing bearer token' }), { status: 401, headers: CORS_HEADERS })
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!, // anon key + the caller's JWT; no service role needed here
  )
  const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS })
  }

  let payload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS_HEADERS })
  }

  const text = typeof payload?.text === 'string' ? payload.text.trim() : ''
  if (!text) return new Response(JSON.stringify({ error: 'Expected { text }' }), { status: 400, headers: CORS_HEADERS })
  if (text.length > 512) return new Response(JSON.stringify({ error: 'Text too long' }), { status: 413, headers: CORS_HEADERS })

  try {
    const embedding = await generateEmbedding(text)
    return new Response(
      JSON.stringify({ embedding, dimensions: 384, model: 'gte-small' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Embedding failed' }),
      { status: 500, headers: CORS_HEADERS },
    )
  }
})
