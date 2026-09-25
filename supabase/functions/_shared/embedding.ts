/**
 * embedding.ts — GhostFinEx RAG embedding service (the ONLY file that knows
 * how embeddings are produced).
 *
 * ISOLATION CONTRACT: nothing else in the codebase may import an embedding
 * model, hard-code a dimension, or call an embedding API. To switch models
 * later, change EMBEDDING_MODEL here and follow the CHANGE CHECKLIST below —
 * no other file needs to change conceptually (only the vector column and any
 * stored vectors).
 *
 * Model choice (documented, verified):
 *   Supabase/gte-small — runs natively in Edge Functions via the built-in AI
 *   inference API (no external provider, no keys, no cost per call). It is
 *   the model Supabase documents for this exact use case. Output: 384
 *   dimensions, normalized at generation time (mean pooling + L2 norm).
 *
 * Distance metric: cosine (1 - <=>) over normalized vectors, used by the
 *   match_financial_knowledge Postgres RPC.
 *
 * CHANGE CHECKLIST (if the model is ever swapped):
 *   1. Update EMBEDDING_MODEL + EMBEDDING_DIMENSIONS below.
 *   2. Update the vector(N) column in database/rag_schema.sql and re-ingest.
 *   3. ragService.js / RAG_DEFAULTS consumers keep working unchanged.
 *
 * If a Hugging Face embedding model is chosen later, verify its real output
 * dimension first (e.g. via the model card) — never guess it.
 */

/** Model identifier. Overridable via env for experimentation. */
export const EMBEDDING_MODEL = Deno.env.get('RAG_EMBEDDING_MODEL') ?? 'gte-small'

/** Vector dimension of the selected model. gte-small is documented at 384. */
export const EMBEDDING_DIMENSIONS = 384

/** Postgres/pinecone-style distance metric used by the retrieval RPC. */
export const EMBEDDING_DISTANCE_METRIC = 'cosine'

let session = null

/** Generate one embedding. Throws on dimension mismatch (fail loud). */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!session) session = new Supabase.ai.Session(EMBEDDING_MODEL)
  const output = await session.run(text, { mean_pool: true, normalize: true })
  const embedding = typeof output === 'string' ? JSON.parse(output) : output
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length ?? 'n/a'}`)
  }
  return embedding
}

/** Generate embeddings for many texts sequentially (cost/usage friendly). */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const out: number[][] = []
  for (const text of texts) out.push(await generateEmbedding(text))
  return out
}
