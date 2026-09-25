/**
 * ragService.js — RAG FOUNDATION client abstraction (no LLM, no Ghost yet).
 *
 * Scope: financial EDUCATION retrieval only. This service searches the
 * application-owned knowledge library — general educational documents. It is
 * never used to compute balances, expenses, savings, affordability, budgets,
 * or totals: those remain deterministic (lib/finance.js) over the user's own
 * Supabase financial tables.
 *
 * Flow: query text → gte-small embedding (384-dim, generated inside the
 * rag-embed Edge Function — the browser never holds a model or a service key)
 * → match_financial_knowledge Postgres RPC (SECURITY INVOKER; the caller's
 * RLS applies) → top chunks with title/category/similarity. Deterministic
 * retrieval: fixed threshold, fixed small limit.
 */

import { supabase } from './supabase'

/** Match these against the RPC's tuning constants (edge-embedded defaults). */
export const RAG_DEFAULTS = { matchThreshold: 0.75, matchCount: 4 }

function message(error, fallback) {
  return error instanceof Error ? error.message : (error?.message ?? fallback)
}

/**
 * Search the financial-education knowledge base.
 * Returns { data, error } where data is a list of
 * { chunkId, documentId, title, category, content, similarity }.
 */
export async function searchKnowledge(query, { matchThreshold = RAG_DEFAULTS.matchThreshold, matchCount = RAG_DEFAULTS.matchCount } = {}) {
  const text = typeof query === 'string' ? query.trim() : ''
  if (!text) return { data: [], error: null }
  if (!supabase) return { data: null, error: 'Supabase is not configured in this build.' }
  if (text.length > 512) return { data: null, error: 'Query too long.' }

  try {
    const { data: embedData, error: embedError } = await supabase.functions.invoke('rag-embed', {
      body: { text },
    })
    if (embedError) return { data: null, error: message(embedError, 'Could not create a search vector for your question.') }

    const queryEmbedding = typeof embedData?.embedding === 'string' ? JSON.parse(embedData.embedding) : embedData?.embedding
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 384) {
      return { data: null, error: 'Unexpected embedding format from the knowledge service.' }
    }

    const { data, error } = await supabase.rpc('match_financial_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    })
    if (error) return { data: null, error: message(error, 'Knowledge search failed.') }

    return {
      data: (data ?? []).map((row) => ({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        title: row.title,
        category: row.category,
        content: row.content,
        similarity: Number(row.similarity),
      })),
      error: null,
    }
  } catch (err) {
    return { data: null, error: message(err, 'Knowledge search failed.') }
  }
}
