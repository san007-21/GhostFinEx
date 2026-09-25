#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
/**
 * seedRagKnowledge.mjs — RAG knowledge seeding for GhostFinEx.
 *
 * Modes:
 *   node scripts/seedRagKnowledge.mjs --dry-run
 *       Unit-check the chunker and print per-document chunk counts.
 *       No database access, no secrets needed.
 *
 *   node scripts/seedRagKnowledge.mjs
 *       Ingest: upsert documents by title, chunk deterministically, and ask
 *       the rag-ingest Edge Function to embed (gte-small, 384-dim) and store
 *       chunks. Repeatable — upserts by title / (document_id, chunk_index),
 *       never duplicates.
 *
 * Env (read from frontend/.env, supabase/functions/.env, or the process
 * environment — process env always wins):
 *   VITE_SUPABASE_URL (or SUPABASE_URL)
 *   VITE_SUPABASE_ANON_KEY | VITE_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)
 *   RAG_INGEST_TOKEN (REQUIRED for ingestion — the admin secret configured on
 *       the rag-ingest Edge Function via `supabase secrets set`). Without it
 *       the script refuses to ingest and exits non-zero. It is never used as
 *       a fallback to the public Supabase key, and the public key is never
 *       used as a fallback to it.
 *
 * No service_role key is used anywhere: document writes happen inside the
 * Edge Function (service role on the server), never from this script.
 */

const MAX_CHARS = 900
const MIN_CHARS = 120

/* ============================== knowledge ================================ */
/* General financial education. Never personalized advice; never user data.  */

const NOTE = 'General financial education — not personalized financial advice.'

const SEED_DOCUMENTS = [
  {
    title: 'Budgeting basics',
    source: 'GhostFinEx Education Library',
    category: 'Budgeting',
    content: `A budget is a plan for money you have not spent yet. You decide in advance where each part of your income should go — essentials, studies, savings, and the fun stuff — instead of discovering where it went after the fact.\n\nA simple student budget has three steps. First, write down reliable monthly income: salary, stipend, allowance, bursary. Second, list fixed commitments like rent, data, and transport. Third, assign what remains to flexible categories, keeping the total equal to your income.\n\nGhostFinEx lets you track a monthly budget and compare it with what you actually log as expenses. The numbers you enter stay yours; the app only does the arithmetic.\n\n${NOTE}`,
  },
  {
    title: 'Needs vs wants',
    source: 'GhostFinEx Education Library',
    category: 'Budgeting',
    content: `A need is something that genuinely keeps you functioning — food, shelter, medicine, transport to campus. A want improves your life but is not required for it: the newest phone, another streaming service, takeaways on a night you could cook.\n\nThe line can be blurry. A phone is a need for many students; the premium model is usually a want. Asking "what happens if I delay this by thirty days?" is a reliable test — wants survive the wait, and often fade.\n\nSorting spending into needs and wants does not mean never buying wants. It means choosing them deliberately, after the needs are funded.\n\n${NOTE}`,
  },
  {
    title: 'Zero-based budgeting',
    source: 'GhostFinEx Education Library',
    category: 'Budgeting',
    content: `Zero-based budgeting means every unit of income gets an assigned job until nothing is unassigned — income minus all planned categories equals zero. Zero does not mean "spent with nothing saved"; savings and an emergency buffer are categories like any other.\n\nStudents often like this method because it is concrete: instead of a vague intention to save "what is left", the leftover is planned from the start, so it cannot quietly disappear into small unplanned purchases.\n\nIt takes a few minutes each month. Write income at the top, list categories in order of priority, adjust until the plan balances to zero, then track actual spending against it.\n\n${NOTE}`,
  },
  {
    title: 'The 50/30/20 framework',
    source: 'GhostFinEx Education Library',
    category: 'Budgeting',
    content: `The 50/30/20 rule is a starting framework: roughly 50% of after-tax income for needs, 30% for wants, and 20% for savings and debt repayment beyond minimums.\n\nIt is a guide, not a law. A student with shared housing might spend far less than 50% on needs; a student in an expensive city might spend far more and save less for a while. The value is the conversation it starts about proportions, not the exact numbers.\n\nIn GhostFinEx you can approximate the framework by setting your monthly budget, then watching which categories grow beyond their share.\n\n${NOTE}`,
  },
  {
    title: 'Monthly budget planning',
    source: 'GhostFinEx Education Library',
    category: 'Budgeting',
    content: `A monthly budget works best when it is planned once and reviewed lightly. At the start of the month, assign income to categories in priority order: essentials first, savings next, flexible spending last. During the month, log spending as it happens rather than reconstructing it later from memory.\n\nA useful mid-month habit is one ten-minute check: compare what is logged so far against what was planned, and adjust the flexible categories while there is still time to react.\n\nBudgets are forecasts, and forecasts miss sometimes. A missed budget is information for next month's plan, not a personal failure.\n\n${NOTE}`,
  },
  {
    title: 'Emergency funds',
    source: 'GhostFinEx Education Library',
    category: 'Saving',
    content: `An emergency fund is money set aside for genuine surprises — a laptop that dies during exams, a medical bill, an unexpected trip home. Its job is to keep a bad week from becoming debt.\n\nA common target is three to six months of essential expenses, but for students the honest first milestone is smaller: one month of essentials, or even a fixed starter amount like the cost of a repair or a month of data. Any buffer beats none.\n\nKeep it somewhere reachable but not convenient — a separate savings account works well. If it sits in the card you tap every day, it quietly becomes spending money.\n\n${NOTE}`,
  },
  {
    title: 'Sinking funds',
    source: 'GhostFinEx Education Library',
    category: 'Saving',
    content: `A sinking fund is saving in reverse: you name an expected future expense — textbooks next semester, a car service, a birthday trip — and set aside a little for it every month until it arrives.\n\nIt differs from an emergency fund because the expense is expected, and it differs from a general savings goal because it is usually short-term and specific. Divide the total by the months you have, and you get the monthly amount.\n\nSinking funds smooth out "expensive months". When the textbook bill lands, the money is already waiting — and your regular budget is untouched.\n\n${NOTE}`,
  },
  {
    title: 'Setting savings goals',
    source: 'GhostFinEx Education Library',
    category: 'Saving',
    content: `A savings goal has four parts: what you are saving for, the target amount, a target date, and the money you have already put toward it. With those four numbers you can always answer "am I on track?"\n\nThe remaining amount divided by the time left gives the required contribution — per month or per week. If that number feels unrealistic, you have three honest levers: extend the date, lower the target, or reduce other spending.\n\nIn GhostFinEx, goals track exactly these fields, and progress is calculated from the contributions you record — never from money simply left over in your account.\n\n${NOTE}`,
  },
  {
    title: 'Short-term vs long-term saving',
    source: 'GhostFinEx Education Library',
    category: 'Saving',
    content: `Short-term saving covers money you plan to spend within roughly a year — a laptop fund, a trip, next semester's books. It belongs somewhere safe and reachable, where the priority is certainty rather than growth.\n\nLong-term saving is money you will not touch for years. Over long periods, keeping pace with inflation starts to matter more than day-to-day safety, which is why longer-horizon goals are usually paired with different kinds of accounts and instruments.\n\nMixing the two in one pot causes problems: long-term money gets raided for short-term wants, and short-term money gets locked away where it cannot help. Naming the purpose and time frame of each saving goal keeps them separate.\n\n${NOTE}`,
  },
  {
    title: 'Consistent saving habits',
    source: 'GhostFinEx Education Library',
    category: 'Saving',
    content: `Consistency beats intensity. Saving a small amount every month builds the habit and the balance; heroic saving that lasts six weeks usually ends in burnout and a raided account.\n\nTwo techniques help. Pay yourself first: move the savings amount out on the day income arrives, before spending starts. Automate where possible: a standing order does not rely on month-end willpower.\n\nTrack contributions separately from what merely remains unspent at month end. Money left over is cash flow, not necessarily savings — naming a contribution makes it real.\n\n${NOTE}`,
  },
  {
    title: 'How interest works',
    source: 'GhostFinEx Education Library',
    category: 'Debt',
    content: `Interest is the price of using someone else's money. When you borrow, interest is what the lender charges you; when you save, interest is what the bank pays you for depositing funds.\n\nRates are quoted annually, but most debt charges interest monthly on the outstanding balance. That detail matters: a 12% annual rate on a card balance is roughly 1% added every month you carry it.\n\nAt the same nominal rate, the cost of debt is usually higher than the reward of savings, because lenders charge more than banks pay. Understanding this asymmetry is the first step to prioritizing repayments.\n\n${NOTE}`,
  },
  {
    title: 'EMI basics',
    source: 'GhostFinEx Education Library',
    category: 'Debt',
    content: `An EMI — equated monthly installment — repays a loan in equal monthly payments that cover both interest and principal. Early in the loan, a larger share of each payment is interest; later, more goes to the principal.\n\nTwo levers change the total cost: the rate and the term. A longer term lowers each payment but increases the total interest paid over the life of the loan. A shorter term does the opposite.\n\nBefore taking an installment, compare the total repayable amount, not just the monthly figure. A "small" monthly payment stretched over years can double the price of what you are buying.\n\n${NOTE}`,
  },
  {
    title: 'Credit utilization',
    source: 'GhostFinEx Education Library',
    category: 'Debt',
    content: `Credit utilization is the share of your available revolving credit you are currently using — card balance divided by card limit, across all cards. Using R 1,000 of a R 5,000 limit is 20% utilization.\n\nLenders generally view lower utilization as healthier, with the commonly cited guidance staying below about 30%. High utilization signals reliance on credit, even if you pay on time.\n\nThe practical habit: treat card limits as emergency capacity, not available spending money, and clear the full balance monthly where you can.\n\n${NOTE}`,
  },
  {
    title: 'Debt repayment concepts',
    source: 'GhostFinEx Education Library',
    category: 'Debt',
    content: `Two popular strategies organize paying off several debts. The avalanche method targets the highest interest rate first, which minimizes total interest paid. The snowball method targets the smallest balance first, which delivers a motivating early win.\n\nBoth keep every debt's minimum payment covered and direct all extra repayment money at one chosen debt at a time. Mathematically the avalanche wins; behaviorally the snowball keeps some people going.\n\nThe best strategy is the one you will actually follow. Whichever you choose, avoid new borrowing while repaying — otherwise it is like bailing water while the tap is open.\n\n${NOTE}`,
  },
  {
    title: 'Recurring expenses and subscriptions',
    source: 'GhostFinEx Education Library',
    category: 'Subscriptions',
    content: `Subscriptions are small decisions with monthly echo. R 50 a month sounds trivial; twelve services later it is R 600 a month — R 7,200 a year — leaving quietly, without a single memorable purchase.\n\nTheir danger is inertia: they renew automatically, and cancelling requires effort while staying requires nothing. Companies price them small for exactly this reason.\n\nList every recurring charge you have, with its amount and renewal date. Seeing the total monthly burden in one place is usually the most persuasive financial exercise a student can do.\n\n${NOTE}`,
  },
  {
    title: 'Identifying unused subscriptions',
    source: 'GhostFinEx Education Library',
    category: 'Subscriptions',
    content: `Unused subscriptions rarely announce themselves — they hide in plain sight on bank statements as familiar small amounts. The reliable way to surface them is a reverse review: start from the statement, not from memory, and match every repeating charge to a service you actually used in the last month.\n\nCharges that cannot be matched, or match to something forgotten, are the first cancellation candidates. A surprising share of subscription spend is typically on services a person would not resubscribe to today.\n\nFree trials are a common origin: they convert quietly unless tracked. Marking the trial's end date at signup prevents most of these leaks before they start.\n\n${NOTE}`,
  },
  {
    title: 'Subscription audits',
    source: 'GhostFinEx Education Library',
    category: 'Subscriptions',
    content: `A subscription audit is a monthly five-minute habit: open your bank statement, find every repeating charge, and ask three questions. Did I use this in the last month? Would I buy it again today at this price? Is there a cheaper tier that serves the same need?\n\nAnything that fails the test gets cancelled or downgraded. Most services let you resubscribe later — the loss of a month you did not use is bigger than the cost of rejoining.\n\nDo this before renewals land, not after. Marking renewal dates in a calendar turns surprise charges into decisions you make in advance.\n\n${NOTE}`,
  },
  {
    title: 'Price comparison skills',
    source: 'GhostFinEx Education Library',
    category: 'Shopping',
    content: `Comparison shopping is simple in theory — find the same item at several sellers and buy the cheapest — but three details catch people out. First, confirm the item is genuinely identical: model number, size, warranty. Second, add delivery fees to the price. Third, check the seller's return terms.\n\nA few minutes of checking typically beats a few minutes of earning the same amount. For a R 300 item, saving 15% is R 45 — roughly an hour of part-time work for many students.\n\nTrack previous prices where you can: a "discount" from an inflated original price is not a saving at all.\n\n${NOTE}`,
  },
  {
    title: 'Total cost of ownership',
    source: 'GhostFinEx Education Library',
    category: 'Shopping',
    content: `The price tag is rarely the whole cost. Total cost of ownership includes everything an item will cost over its life: ink with a cheap printer, data with a budget phone, maintenance with a used laptop, consumables with a coffee machine.\n\nA cheap item that breaks twice can cost more than a durable one that lasts. This does not always mean buying expensive — it means pricing the full journey before choosing.\n\nA practical habit: before buying anything over a small threshold, write the purchase price plus one year of running costs. Decide on that number, not the sticker.\n\n${NOTE}`,
  },
  {
    title: 'Opportunity cost',
    source: 'GhostFinEx Education Library',
    category: 'Shopping',
    content: `Every purchase is also a decision about what not to buy. The R 200 spent on takeaways tonight is simultaneously the R 200 not added to a laptop fund, not covering next month's data, or not going into an emergency buffer. That forgone alternative is the opportunity cost.\n\nThis is not an argument against spending — it is a tool for deciding. Framing a purchase as a trade-off ("this is one week of groceries") makes the comparison concrete in a way a price alone does not.\n\nFor small recurring purchases, multiply by twelve before deciding. A small monthly habit often costs more per year than a big one-time purchase that felt expensive.\n\n${NOTE}`,
  },
  {
    title: 'Impulse spending',
    source: 'GhostFinEx Education Library',
    category: 'Shopping',
    content: `Impulse purchases share a signature: emotional trigger, fast decision, small amount. Checkout counters, one-day sales, and late-night scrolling all engineer exactly that signature.\n\nCountermeasures work by adding friction. The 24-hour rule: park the item and revisit tomorrow — most impulses evaporate. The cart test: leave it in the online cart for a week. The budget check: name which category the money comes from and what loses its funding.\n\nNone of this means never treating yourself. It means treats become decisions instead of reactions — which usually makes them more enjoyable, not less.\n\n${NOTE}`,
  },
  {
    title: 'Inflation',
    source: 'GhostFinEx Education Library',
    category: 'Financial basics',
    content: `Inflation is the general rise of prices over time, which means the same money buys less each year. At 5% inflation, R 100 of groceries costs about R 105 a year later — for identical goods.\n\nInflation matters to students in two ways. It erodes cash sitting idle: money under the mattress loses purchasing power every year. And it should anchor salary negotiations and future planning: a raise below inflation is a real-terms pay cut.\n\nThis is one reason long-term savings are usually held in instruments that aim to at least match inflation, rather than left entirely in cash.\n\n${NOTE}`,
  },
  {
    title: 'Compound interest',
    source: 'GhostFinEx Education Library',
    category: 'Financial basics',
    content: `Compound interest is interest earning interest. Simple interest pays only on the original amount; compounding pays on the original plus everything previously earned, so growth accelerates over time.\n\nTime is the ingredient that matters most. Saving a modest amount early can outperform saving a larger amount later, because early deposits compound through more years. The same mathematics works against you in debt, where unpaid interest compounds into the balance.\n\nThe common summary: compounding rewards patience and punishes procrastination — in both directions.\n\n${NOTE}`,
  },
  {
    title: 'Cash flow',
    source: 'GhostFinEx Education Library',
    category: 'Financial basics',
    content: `Cash flow is the movement of money in and out over a period: income flowing in, expenses flowing out. Positive cash flow means more came in than went out; negative means the gap was funded somehow — savings, credit, or someone else.\n\nCash flow differs from wealth. A student can be asset-rich but cash-poor, or spend far more than their income monthly and look fine until the funding source runs out.\n\nTracking is the whole skill: log income and expenses for a normal month and the pattern is unmistakable. That is precisely what GhostFinEx's overview and ledger make visible.\n\n${NOTE}`,
  },
  {
    title: 'Financial terminology basics',
    source: 'GhostFinEx Education Library',
    category: 'Financial basics',
    content: `A few terms cover most student finance conversations. Income is money coming in. Expenses are money going out. A budget is the plan connecting the two. Cash flow is what actually happened over a period, and net worth is the snapshot of assets minus liabilities at a moment in time.\n\nOn the saving side, a contribution is money you deliberately move into savings, interest is the price of using someone else's money, and inflation is the general rise in prices that shrinks what cash can buy.\n\nOn the debt side, principal is the amount originally borrowed, a term is how long repayment lasts, and utilization is how much of available credit is in use. Precision with these words prevents most confusion in financial advice and product marketing.\n\n${NOTE}`,
  },
  {
    title: 'Net worth',
    source: 'GhostFinEx Education Library',
    category: 'Financial basics',
    content: `Net worth is a snapshot: everything you own (assets) minus everything you owe (liabilities). Cash, savings balances, and resellable items are assets; student loans, card balances, and borrowings from family are liabilities.\n\nThe absolute number matters less than its direction. Tracking net worth a few times a year tells you whether your decisions are compounding in your favor or quietly leaking.\n\nFor students the number is often negative — and that is normal early in life. What matters is the trajectory once income grows and debt shrinks.\n\n${NOTE}`,
  },
]

/* ============================ chunking (port) ============================= */
/* Mirrors supabase/functions/rag-ingest/chunking.ts exactly (byte-equal).   */

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Split an over-long unit at whitespace boundaries (never mid-word). */
function splitLongUnit(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean)
  const pieces = []
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
  const out = []
  for (const piece of pieces) {
    if (piece.length <= maxChars) {
      out.push(piece)
    } else {
      for (let i = 0; i < piece.length; i += maxChars) out.push(piece.slice(i, i + maxChars))
    }
  }
  return out
}

function pack(units, maxChars) {
  const chunks = []
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

function chunkText(content) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const units = []
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
  const merged = []
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

/* ================================ modes ================================== */

function loadEnv() {
  // Best-effort, secret-neutral .env loading for local development.
  // Never prints values; never overwrites an explicit process-env entry.
  const candidates = [
    path.join(process.cwd(), 'frontend', '.env'),
    path.join(process.cwd(), 'supabase', 'functions', '.env'), // local Edge Function secrets
  ]
  try {
    for (const envPath of candidates) {
      if (!fs.existsSync(envPath)) continue
      for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const m = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*)\s*$/)
        if (m && process.env[m[1]] === undefined) {
          // Strip one layer of matching quotes, then trim.
          let v = m[2].trim()
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
          process.env[m[1]] = v
        }
      }
    }
  } catch { /* env loading is best-effort */ }
}

function selfTest() {
  const cases = [
    ['', 0],
    ['One short paragraph.', 1],
    ['p1\n\np2\n\np3', 1],
  ]
  for (const [input, expectedMin] of cases) {
    if (chunkText(input).length < expectedMin) throw new Error(`chunker self-test failed for ${JSON.stringify(input)}`)
  }

  // INVARIANT: every chunk from every case is strictly <= MAX_CHARS.
  const assertInvariant = (chunks, label) => {
    if (!chunks.every((c) => c.length <= MAX_CHARS)) {
      const worst = Math.max(...chunks.map((c) => c.length))
      throw new Error(`chunker exceeded MAX_CHARS (${worst} > ${MAX_CHARS}) in ${label}`)
    }
  }

  // 1. Many long sentences (the old bypass: sentence-level packing).
  assertInvariant(chunkText(('A'.repeat(300) + '. ').repeat(5)), 'long sentences')

  // 2. A single sentence longer than MAX_CHARS — must split at whitespace.
  const longSentence = 'word '.repeat(400).trim() // 2400 chars, one sentence
  const longChunks = chunkText(longSentence)
  assertInvariant(longChunks, 'oversized sentence')
  if (longChunks.length < 2) throw new Error('oversized sentence was not split')
  if (longChunks.join(' ').split(/\s+/).filter(Boolean).length !== 400) {
    throw new Error('oversized sentence split lost or duplicated words')
  }
  // No mid-word cuts: every chunk must rejoin cleanly into the original.
  if (longChunks.join(' ') !== longSentence) throw new Error('sentence split was not word-boundary clean')

  // 3. A single token longer than MAX_CHARS (no whitespace) — hard-sliced.
  const oneToken = 'x'.repeat(2000)
  const tokenChunks = chunkText(oneToken)
  assertInvariant(tokenChunks, 'single oversized token')
  if (tokenChunks.join('') !== oneToken) throw new Error('token hard-slice lost or duplicated characters')

  // 4. Tiny-chunk merging must never push a chunk past MAX_CHARS.
  //    Craft: a first chunk ending near MAX_CHARS followed by a tiny tail.
  const nearFull = 'm'.repeat(MAX_CHARS - 6) + '.' // becomes its own chunk
  const mergeBait = `${nearFull}\n\n${'tiny. '}${'tail '.repeat(4)}end.`
  assertInvariant(chunkText(mergeBait), 'merge cap')

  // 5. The real seed corpus.
  for (const doc of SEED_DOCUMENTS) assertInvariant(chunkText(doc.content), doc.title)
  if (chunkText(SEED_DOCUMENTS[0].content).length < 1) throw new Error('seed doc failed to chunk')

  console.log('chunker self-test: OK (strict MAX_CHARS invariant, whitespace splits, capped merge)')
}

async function main() {
  loadEnv()
  const dryRun = process.argv.includes('--dry-run')

  console.log(`seed documents: ${SEED_DOCUMENTS.length}`)
  let totalChunks = 0
  for (const doc of SEED_DOCUMENTS) {
    const chunks = chunkText(doc.content)
    totalChunks += chunks.length
    console.log(`  ${String(chunks.length).padStart(2)} chunks · ${doc.category.padEnd(16)} ${doc.title}`)
    if (chunks.some((c) => c.length > MAX_CHARS + 2)) throw new Error(`chunk too long in "${doc.title}"`)
  }
  console.log(`total chunks: ${totalChunks}`)
  selfTest()

  if (dryRun) {
    console.log('dry-run complete — no database access performed.')
    return
  }

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing Supabase URL or public key (frontend/.env or environment).')
    process.exit(1)
  }

  // ---- ingestion credential: MANDATORY admin token, nothing else ----------
  // The public Supabase key is endpoint configuration only (function URL +
  // CORS) and is never sent as an ingestion credential. If the server's
  // RAG_INGEST_TOKEN is not set here, the call would be rejected anyway —
  // refuse locally first so the failure is obvious and immediate.
  const ingestToken = process.env.RAG_INGEST_TOKEN
  if (!ingestToken) {
    console.error(
      'RAG_INGEST_TOKEN is required for ingestion but was not found.\n' +
      'The rag-ingest Edge Function rejects every request without it.\n\n' +
      'Set it for this session, or add it to supabase/functions/.env for local development:\n' +
      '  export RAG_INGEST_TOKEN=<the token you set with `supabase secrets set RAG_INGEST_TOKEN`>\n\n' +
      '(Dry-run mode needs no token: node scripts/seedRagKnowledge.mjs --dry-run)',
    )
    process.exit(1)
  }

  console.log('\ningesting via rag-ingest Edge Function…')
  const response = await fetch(`${url}/functions/v1/rag-ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ingestToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documents: SEED_DOCUMENTS }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error(`ingest failed: HTTP ${response.status}`, body?.error ?? body)
    process.exit(1)
  }
  console.log('ingest result:', JSON.stringify(body))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
