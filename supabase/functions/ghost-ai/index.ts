/**
 * ghost-ai — GhostFinEx RAG + Hugging Face inference foundation.
 *
 * Pipeline (knowledge-only, privacy-safe by design):
 *   user question → verify authenticated Supabase user → embed query
 *   (shared embedding service) → pgvector similarity search via
 *   match_financial_knowledge (SECURITY INVOKER — educational knowledge only)
 *   → construct grounded prompt → Hugging Face chat completion → response.
 *
 * PRIVACY CONTRACT: the user's financial database is NEVER sent to the LLM.
 * No balances, no expense history, no savings, no subscriptions — only the
 * question and retrieved public educational knowledge. Deterministic money
 * math stays in lib/finance.js; the model is told never to compute or
 * override financial figures.
 *
 * Secrets: HF_TOKEN and HF_CHAT_MODEL are read from Edge Function secrets
 * (supabase secrets set) — never from the browser, never logged, never
 * returned in responses.
 */
// @ts-nocheck — Deno Edge Function; typechecked by `supabase functions` tooling
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { InferenceClient } from 'npm:@huggingface/inference@4'
import { generateEmbedding } from '../_shared/embedding.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Retrieval tuning — small and deterministic by design. */
const MATCH_THRESHOLD = 0.75
const MATCH_COUNT = 4

/** Dev default; the HF_CHAT_MODEL secret always takes precedence. Per the
 *  architecture audit the configured chat model is Qwen3-4B-Instruct-2507.
 *  Verify availability of whichever model is used on the router at deploy. */
const DEFAULT_CHAT_MODEL = 'Qwen/Qwen3-4B-Instruct-2507'

const MAX_QUESTION_LENGTH = 512

const SYSTEM_PROMPT = `You are Ghost, an educational guide inside GhostFinEx, a student financial decision-support app. Your ONLY job is to explain general financial-education topics clearly, for students, using the KNOWLEDGE CONTEXT provided.

Hard rules:
- Ground every factual claim in the provided KNOWLEDGE CONTEXT. If the context does not cover the question, say plainly that you don't have reliable information on it and suggest what the app's knowledge library does cover.
- You are NOT a financial advisor. Never say or imply you are one. Never give personalized investment instructions, and never recommend specific stocks, funds, crypto, or securities.
- You do NOT have access to the user's financial data. Never invent, assume, or reference their balances, expenses, savings, or subscriptions.
- NEVER calculate or present authoritative financial figures (totals, balances, affordability). The application computes those deterministically itself; any example arithmetic you show must be clearly hypothetical and clearly labeled.
- Answer in short, warm, plain-language paragraphs. Use the same language as the user's question.`

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function safeError(err, fallback) {
  // Only ever surface a message string — never headers, tokens, or stacks.
  return err instanceof Error && err.message ? err.message : fallback
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Missing bearer token' }, 401)

  // 1. Verify the caller is a real Supabase user (never an anonymous endpoint).
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return json({ error: 'Sign in to ask Ghost.' }, 401)

  // 2. Validate the request.
  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }
  const question = typeof payload?.question === 'string' ? payload.question.trim() : ''
  if (!question) return json({ error: 'Ask a question first.' }, 400)
  if (question.length > MAX_QUESTION_LENGTH) {
    return json({ error: `Questions are limited to ${MAX_QUESTION_LENGTH} characters.` }, 400)
  }

  // 3. Retrieve educational knowledge (SECURITY INVOKER RPC — RLS applies;
  //    these tables hold only public educational content, never user data).
  let sources = []
  try {
    const queryEmbedding = await generateEmbedding(question)
    const { data, error } = await supabase.rpc('match_financial_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: MATCH_THRESHOLD,
      match_count: MATCH_COUNT,
    })
    if (error) throw new Error(safeError(error, 'Knowledge search failed.'))
    sources = (data ?? []).map((row) => ({
      title: row.title,
      category: row.category,
      similarity: Number(row.similarity),
      content: row.content,
    }))
  } catch (err) {
    return json({ error: safeError(err, 'Could not search the knowledge library.') }, 503)
  }

  // 4. Grounded prompt. Below threshold → honest no-context answer.
  const contextBlock = sources.length
    ? sources.map((s, i) => `[${i + 1}] (${s.title})\n${s.content}`).join('\n\n')
    : ''

  // 5. Hugging Face chat completion (server-side token; model configurable).
  const hfToken = Deno.env.get('HF_TOKEN')
  if (!hfToken) return json({ error: 'Ghost AI is not configured yet (missing HF_TOKEN secret).' }, 503)
  const model = Deno.env.get('HF_CHAT_MODEL') || DEFAULT_CHAT_MODEL

  try {
    const client = new InferenceClient(hfToken)
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: contextBlock
          ? `KNOWLEDGE CONTEXT:\n${contextBlock}\n\nQuestion: ${question}`
          : `KNOWLEDGE CONTEXT: (nothing relevant found)\n\nQuestion: ${question}`,
      },
    ]
    const completion = await client.chatCompletion({
      provider: 'auto',
      model,
      messages,
      max_tokens: 400,
      temperature: 0.3,
    })
    const answer = completion?.choices?.[0]?.message?.content?.trim() ?? ''
    if (!answer) return json({ error: 'Ghost could not generate an answer — try rephrasing.' }, 502)

    return json({
      answer,
      model,
      sources: sources.map(({ title, category, similarity }) => ({ title, category, similarity })),
    })
  } catch (err) {
    const raw = safeError(err, '')
    const status = /401|unauthorized/i.test(raw) ? 503
      : /403|forbidden|not supported|does not exist/i.test(raw) ? 503
      : /429|rate|quota/i.test(raw) ? 429
      : 502
    // Log only the safe message — no headers, no tokens.
    console.error(`[ghost-ai] HF call failed (${status}): ${raw.slice(0, 200)}`)
    const userMessage = status === 429
      ? 'Ghost AI is a little busy right now — please try again in a moment.'
      : status === 503
        ? 'Ghost AI is temporarily unavailable (model or provider issue). The knowledge library and all other features keep working.'
        : 'Ghost AI could not finish the answer — please try again.'
    return json({ error: userMessage }, status)
  }
})
