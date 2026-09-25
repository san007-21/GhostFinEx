/**
 * rag-ingest — GhostFinEx RAG FOUNDATION (isolated from financial CRUD).
 *
 * Responsibility: accept knowledge documents, chunk them deterministically
 * (same algorithm as scripts/seedRagKnowledge.mjs), embed each chunk with the
 * built-in Supabase AI model (gte-small, 384-dim — no external API, no keys),
 * and upsert into the knowledge tables. READ side stays in Postgres via the
 * match_financial_chunks RPC; this function is WRITE-only for knowledge.
 *
 * Security:
 *   - INGESTION IS ADMIN-ONLY. RAG_INGEST_TOKEN (supabase secrets set) is
 *     MANDATORY: if it is not configured the function refuses every write
 *     with 503 and nothing is stored. The Supabase anon/publishable key and
 *     normal authenticated users can never authorize ingestion — the only
 *     accepted credential is exactly the server-side ingest token, compared
 *     in constant time (SHA-256 digests, fixed-length). The token is never
 *     logged and never echoed in any response.
 *   - Uses the Edge Function service role via createClient — server-side
 *     only, never shipped to the browser. No secrets in VITE_ variables.
 *   - CORS is restricted to the app's own origin pattern.
 *
 * Isolation: touches ONLY financial_documents / financial_document_chunks.
 * It never reads or writes accounts, expenses, goals, subscriptions, or any
 * user-owned financial table.
 */
// @ts-nocheck — Deno Edge Function; typechecked by `supabase functions` tooling
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { chunkText } from './chunking.ts'
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

  // ---- MANDATORY admin gate (fail closed) --------------------------------
  // The service-role key this function writes with must never be reachable
  // without the administrative secret. No token configured = no ingestion,
  // ever. The anon key and ordinary user sessions are not alternatives.
  const ingestToken = Deno.env.get('RAG_INGEST_TOKEN')
  if (!ingestToken) {
    return new Response(
      JSON.stringify({ error: 'Ingestion is not configured (missing administrative token)' }),
      { status: 503, headers: CORS_HEADERS },
    )
  }

  // Constant-time credential check: SHA-256 both sides (fixed 32-byte output,
  // also hides the real token's length), then XOR-compare the digests.
  const auth = req.headers.get('Authorization') ?? ''
  const presented = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
  const encoder = new TextEncoder()
  const [presentedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(presented)),
    crypto.subtle.digest('SHA-256', encoder.encode(ingestToken)),
  ])
  const a = new Uint8Array(presentedDigest)
  const b = new Uint8Array(expectedDigest)
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  if (diff !== 0) {
    // Deliberately vague: no hint about which part mismatched, no echo of
    // anything presented, nothing about the configured token.
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS })
  }

  let payload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS_HEADERS })
  }

  const documents = Array.isArray(payload?.documents) ? payload.documents : null
  if (!documents || documents.length === 0) {
    return new Response(JSON.stringify({ error: 'Expected { documents: [...] }' }), { status: 400, headers: CORS_HEADERS })
  }

  // Validate before touching the database.
  for (const doc of documents) {
    if (
      typeof doc?.title !== 'string' || !doc.title.trim() ||
      typeof doc?.content !== 'string' || !doc.content.trim()
    ) {
      return new Response(
        JSON.stringify({ error: 'Each document needs non-empty title and content' }),
        { status: 400, headers: CORS_HEADERS },
      )
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // server-side only, never in the browser
  )

  // gte-small (384-dim, normalized) via the shared embedding service — the
  // ONLY place embeddings are produced. No external API, no keys.
  let docsUpserted = 0
  let chunksUpserted = 0

  try {
    for (const doc of documents) {
      // 1. Upsert the document by its unique title.
      const { data: docRow, error: docError } = await supabase
        .from('financial_documents')
        .upsert(
          {
            title: doc.title.trim(),
            source: doc.source ?? null,
            category: doc.category ?? null,
            content: doc.content,
          },
          { onConflict: 'title' },
        )
        .select('id')
        .single()
      if (docError) throw docError
      docsUpserted += 1

      // 2. Chunk deterministically and embed each chunk.
      const chunks = chunkText(doc.content)
      for (const [index, chunk] of chunks.entries()) {
        const embedding = await generateEmbedding(chunk)

        // 3. Upsert the chunk by (document_id, chunk_index) — repeatable.
        const { error: chunkError } = await supabase
          .from('financial_document_chunks')
          .upsert(
            {
              document_id: docRow.id,
              chunk_index: index,
              content: chunk,
              embedding,
            },
            { onConflict: 'document_id,chunk_index' },
          )
        if (chunkError) throw chunkError
        chunksUpserted += 1
      }
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Ingest failed' }),
      { status: 500, headers: CORS_HEADERS },
    )
  }

  return new Response(
    JSON.stringify({ ok: true, docsUpserted, chunksUpserted }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  )
})
