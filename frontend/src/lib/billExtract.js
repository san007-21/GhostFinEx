/**
 * billExtract.js — deterministic bill/receipt extraction from raw OCR text.
 *
 * PURE functions, no AI, no network: the same OCR text always yields the same
 * draft. Extracted values are SUGGESTIONS for the review screen — never a
 * financial source of truth. When evidence is weak or conflicting, the
 * extractor says so (confidence: 'partial' | 'failed') instead of guessing,
 * and the UI leaves those fields empty for the student to fill in.
 *
 * Amount rules (the money field is the dangerous one):
 * - Every R-amount in the text is a candidate.
 * - Lines containing total-ish keywords (total, amount due, balance due, …)
 *   are strongly preferred; otherwise the LARGEST candidate is the
 *   leading suggestion only when it is clearly larger than the rest.
 * - Multiple DISTINCT total-keyword amounts = conflicting evidence → the
 *   amount is NOT picked; the field stays empty and confidence degrades.
 */

/** Currency amounts like "R 1 249,99" / "R1,249.99" / "R 92" / "1 249.95 R". */
const AMOUNT_RE = /R\s?(\d{1,3}(?:[ ,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?=[^\d]|$)/gi

/** Lines that plausibly carry the bill total. */
const TOTAL_KEYWORD_RE = /\b(total|amount due|balance due|total due|grand total|to pay|amount payable|total payable|subtotal)\b/i

/** Lines that are clearly NOT the total even if they carry an amount. */
const NOT_TOTAL_RE = /\b(cash|change|tender|paid|visa|mastercard|card|vat|tax|incl|discount|savings|change due|debit|credit|auth|refund|loyalty|points|balance\b.*b\/f)\b/i

/** yyyy-mm-dd | dd/mm/yyyy | dd-mm-yyyy | dd mmm yyyy | dd mmmmm yyyy */
const DATE_PATTERNS = [
  /\b(\d{4})-(\d{2})-(\d{2})\b/,
  /\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/,
  /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/i,
]

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }

/** Weak category hints — a suggestion only, always user-editable. */
const CATEGORY_HINTS = [
  ['Food', /\b(supermarket|grocer|groceries|cafe|coffee|kitchen|restaurant|bakery|butcher|food|takeaway|deli|market)\b/i],
  ['Transport', /\b(taxi|uber|bolt|transport|fuel|petrol|garage|parking|bus|train)\b/i],
  ['Education', /\b(book|books|stationer|printing|campus|university|college|textbook|tuition|study)\b/i],
  ['Entertainment', /\b(cinema|movie|theatre|concert|games|streaming|tickets?\b)/i],
  ['Shopping', /\b(store|clothing|fashion|retail|outfitters|wear|pharmacy|mall)\b/i],
  ['Subscriptions', /\b(subscription|monthly plan|airtime|data bundle|data top.?up)\b/i],
]

function parseAmount(raw) {
  const num = Number(String(raw).replace(/[ ,]/g, '').replace(',', '.'))
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : null
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** Candidates with source context. Returns [] when nothing parseable. */
export function amountCandidates(text) {
  const out = []
  for (const line of String(text ?? '').split('\n')) {
    AMOUNT_RE.lastIndex = 0
    let match
    while ((match = AMOUNT_RE.exec(line)) !== null) {
      const amount = parseAmount(match[1])
      if (amount !== null) {
        out.push({
          amount,
          line: line.trim().slice(0, 80),
          isTotalKeyword: TOTAL_KEYWORD_RE.test(line),
          excluded: NOT_TOTAL_RE.test(line),
        })
      }
    }
  }
  return out
}

/** First plausible date on the bill, as 'YYYY-MM-DD'; null when absent. */
export function extractDate(text) {
  const s = String(text ?? '')
  for (const re of DATE_PATTERNS) {
    const m = s.match(re)
    if (!m) continue
    if (re === DATE_PATTERNS[0]) {
      return `${m[1]}-${m[2]}-${m[3]}`
    }
    if (re === DATE_PATTERNS[1]) {
      const d = Number(m[1]); const mo = Number(m[2]); const y = Number(m[3])
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad2(mo)}-${pad2(d)}`
      continue
    }
    const mo = MONTHS[m[2].toLowerCase()]
    if (mo) return `${m[3]}-${pad2(mo)}-${pad2(Number(m[1]))}`
  }
  return null
}

/** Merchant: highest short-ish line that isn't a date/amount/address junk. */
export function extractMerchant(text) {
  const lines = String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  for (const line of lines.slice(0, 8)) {
    if (line.length < 2 || line.length > 40) continue
    if (/^\d/.test(line)) continue
    if (AMOUNT_RE.test(line)) continue
    if (/\b(receipt|invoice|tax|vat|tel|phone|www\.|\.co\.za|\.com|address)\b/i.test(line)) continue
    if (!/[a-z]/i.test(line)) continue
    return line.replace(/\s{2,}/g, ' ')
  }
  return ''
}

/** Receipt/invoice number if one is labeled or obviously formatted. */
export function extractInvoiceNumber(text) {
  const m = String(text ?? '').match(/\b(?:inv(?:oice)?\.?\s*#?|receipt\s*#?|ref(?:erence)?\.?\s*#?)\s*[:#]?\s*([A-Z0-9][A-Z0-9-/]{2,20})\b/i)
  return m ? m[1].toUpperCase() : ''
}

/** Weak keyword category suggestion; '' when nothing hints. */
export function suggestCategory(text) {
  for (const [category, re] of CATEGORY_HINTS) {
    if (re.test(String(text ?? ''))) return category
  }
  return ''
}

/**
 * Extract a draft from OCR text.
 * Returns { merchant, amount, date, invoiceNumber, suggestedCategory,
 *           amountCandidates, confidence }.
 * confidence:
 *   'good'    — amount + merchant both found cleanly
 *   'partial' — some fields found; review matters (default expectation)
 *   'failed'  — nothing reliable (UI shows the manual-entry message)
 */
export function extractBill(text) {
  const merchant = extractMerchant(text)
  const date = extractDate(text)
  const invoiceNumber = extractInvoiceNumber(text)
  const suggestedCategory = suggestCategory(text)
  const candidates = amountCandidates(text)

  // Conflicting total-keyword amounts: refuse to pick one silently.
  const totalKeywordAmounts = [...new Set(candidates.filter((c) => c.isTotalKeyword && !c.excluded).map((c) => c.amount))]
  const usable = candidates.filter((c) => !c.excluded)
  const amounts = [...new Set(usable.map((c) => c.amount))]

  let amount = null
  let confidence = 'partial'

  // VAT/cash/change/tender lines suggest the real total exists but was
  // missed by OCR — the remaining single amount is then likely an item
  // price, so we do NOT promote it to the bill total.
  const hasPaymentContext = candidates.some((c) => c.excluded)

  if (totalKeywordAmounts.length === 1) {
    amount = totalKeywordAmounts[0]
  } else if (totalKeywordAmounts.length > 1) {
    amount = null // conflicting totals — never guess
  } else if (amounts.length === 1 && !hasPaymentContext) {
    amount = amounts[0]
  } else if (amounts.length > 1) {
    // No total keyword: the largest amount is the total when it either
    // equals the sum of the others (items adding up) or clearly dominates.
    const sorted = [...amounts].sort((a, b) => b - a)
    const restSum = Math.round(sorted.slice(1).reduce((s, v) => s + v, 0) * 100) / 100
    if (Math.abs(sorted[0] - restSum) < 0.01 || sorted[0] >= sorted[1] * 2) {
      amount = sorted[0]
    }
  }

  if (amount === null && !merchant) {
    confidence = 'failed'
  } else if (amount !== null && merchant) {
    confidence = 'good'
  }

  return {
    merchant,
    amount,
    date,
    invoiceNumber,
    suggestedCategory,
    amountCandidates: candidates.map((c) => ({ amount: c.amount, line: c.line })),
    confidence,
  }
}
