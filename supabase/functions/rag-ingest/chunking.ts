/**
 * chunking.ts — deterministic chunking for RAG ingestion.
 *
 * The same algorithm is implemented (and unit-checked) in
 * scripts/seedRagKnowledge.mjs so local dry-runs produce byte-identical
 * chunks to this Edge Function. One strategy, no over-engineering:
 *
 *   1. Split content on blank lines into paragraphs (trim each).
 *   2. Greedily pack consecutive paragraphs into chunks up to MAX_CHARS.
 *   3. A paragraph longer than MAX_CHARS is split on sentence ends
 *      (deterministic regex), then packed the same way.
 *   4. A sentence longer than MAX_CHARS is split at whitespace boundaries
 *      (never mid-word); a single token longer than MAX_CHARS is hard-sliced
 *      as a last resort so the size invariant always holds.
 *   5. Tiny chunks are merged into their neighbour only when the merged
 *      result still fits within MAX_CHARS.
 *
 * INVARIANT: no returned chunk ever exceeds MAX_CHARS. Whole
 * sentences/paragraphs are kept wherever possible — no mid-word cuts except
 * the single-token last resort — so embeddings stay semantically coherent.
 */

export const MAX_CHARS = 900
export const MIN_CHARS = 120

function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+/)
  return parts.map((s) => s.trim()).filter(Boolean)
}

/** Split an over-long unit at whitespace boundaries (never mid-word). */
function splitLongUnit(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const pieces: string[] = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ' ' + word
    } else {
      pieces.push(current)
      current = word
    }
  }
  if (current) pieces.push(current)

  // Last resort: a single token longer than maxChars (no whitespace to split
  // on). Hard-slice it so the ≤ maxChars invariant can never be violated.
  const out: string[] = []
  for (const piece of pieces) {
    if (piece.length <= maxChars) {
      out.push(piece)
    } else {
      for (let i = 0; i < piece.length; i += maxChars) out.push(piece.slice(i, i + maxChars))
    }
  }
  return out
}

function pack(units: string[], maxChars: number): string[] {
  const chunks: string[] = []
  let current = ''
  for (const unit of units) {
    if (current && (current + '\n\n' + unit).length > maxChars) {
      chunks.push(current)
      current = unit
    } else {
      current = current ? current + '\n\n' + unit : unit
    }
  }
  if (current) chunks.push(current)
  return chunks
}

/** Split document content into retrieval-ready chunks (pure, deterministic). */
export function chunkText(content: string): string[] {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const units: string[] = []
  for (const paragraph of paragraphs) {
    if (paragraph.length <= MAX_CHARS) {
      units.push(paragraph)
      continue
    }
    for (const sentence of splitSentences(paragraph)) {
      if (sentence.length <= MAX_CHARS) units.push(sentence)
      else units.push(...splitLongUnit(sentence, MAX_CHARS))
    }
  }

  // Merge stray tiny chunks (e.g. a short final sentence) into readable
  // chunks — but never past MAX_CHARS.
  const packed = pack(units, MAX_CHARS)
  const merged: string[] = []
  for (const chunk of packed) {
    const prev = merged[merged.length - 1]
    if (prev && chunk.length < MIN_CHARS && prev.length + 2 + chunk.length <= MAX_CHARS) {
      merged[merged.length - 1] = prev + '\n\n' + chunk
    } else {
      merged.push(chunk)
    }
  }
  return merged
}
