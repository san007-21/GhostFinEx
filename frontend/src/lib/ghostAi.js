/**
 * ghostAi.js — frontend client for the ghost-ai Edge Function (RAG + HF).
 *
 * SECURITY: this client never sees, holds, or sends any AI provider token.
 * It only talks to the Supabase Edge Function, which reads HF_TOKEN from
 * server-side secrets. The user's financial data is never sent — the
 * function retrieves public educational knowledge only (privacy contract
 * documented there).
 *
 * Error handling: every failure path returns { data: null, error } with a
 * user-facing message. Nothing is silently swallowed; nothing exposes
 * provider internals.
 */

import { supabase } from './supabase'

function message(error, fallback) {
  return error instanceof Error ? error.message : (error?.message ?? fallback)
}

/** Map Edge Function status codes to friendly, honest user messages. */
function friendlyEdgeError(status, edgeMessage) {
  switch (status) {
    case 401:
      return 'Sign in to ask Ghost — the assistant is available to signed-in students.'
    case 429:
      return 'Ghost AI is a little busy right now — please try again in a moment.'
    case 503:
      return edgeMessage ?? 'Ghost AI is temporarily unavailable. Everything else keeps working.'
    default:
      return edgeMessage ?? 'Ghost AI could not answer right now — please try again.'
  }
}

/**
 * Ask Ghost a financial-education question.
 * Returns { data, error } where data is
 * { answer, model, sources: [{ title, category, similarity }] }.
 */
export async function askGhost(question, { signal } = {}) {
  const text = typeof question === 'string' ? question.trim() : ''
  if (!text) return { data: null, error: 'Ask a question first.' }
  if (text.length > 512) return { data: null, error: 'Questions are limited to 512 characters.' }
  if (!supabase) return { data: null, error: 'Ghost AI needs a Supabase connection, which this build does not have.' }

  try {
    const { data, error, status } = await supabase.functions.invoke(
      'ghost-ai',
      { body: { question: text }, ...(signal ? { signal } : {}) },
    )
    if (error) return { data: null, error: friendlyEdgeError(status, message(error, null)) }
    const answer = typeof data?.answer === 'string' ? data.answer.trim() : ''
    if (!answer) return { data: null, error: 'Ghost returned an empty answer — try rephrasing your question.' }
    return {
      data: {
        answer,
        model: data.model ?? null,
        sources: Array.isArray(data.sources)
          ? data.sources.map((s) => ({ title: s.title, category: s.category, similarity: Number(s.similarity) }))
          : [],
      },
      error: null,
    }
  } catch (err) {
    if (err?.name === 'AbortError') return { data: null, error: 'Question cancelled.' }
    return { data: null, error: message(err, 'Could not reach Ghost AI — check your connection and try again.') }
  }
}
