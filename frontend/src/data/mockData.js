/**
 * mockData.js — DEMO / MOCK DATA ONLY.
 *
 * ⚠️ Everything in this file is static sample data for the frontend
 * prototype. It is NOT fetched from any API, and none of these numbers are
 * real user data. When a backend is introduced, these objects define the
 * shape the API will return and will be replaced by real queries.
 *
 * The demo seed is deterministic: the same numbers appear on every fresh
 * load so every calculation can be verified by hand.
 */

/* ------------------------------- profile -------------------------------- */

export const DEMO_PROFILE = {
  displayName: 'Demo Student',
  currency: 'ZAR',
  monthlyIncome: 4200,
  availableBalance: 2860,
  monthlyBudget: 3800,
}

/* ------------------------------- expenses ------------------------------- */

/** The seven fixed spending categories used across the app. */
export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Education',
  'Entertainment',
  'Shopping',
  'Subscriptions',
  'Other',
]

/** Category accent tones used by badges and charts. */
export const CATEGORY_TONES = {
  Food: 'accent',
  Transport: 'info',
  Education: 'violet',
  Entertainment: 'pink',
  Shopping: 'warn',
  Subscriptions: 'info',
  Other: 'neutral',
}

export const DEMO_EXPENSES = [
  { id: 'exp-001', name: 'Weekly groceries', amount: 460, category: 'Food', date: '2026-09-01' },
  { id: 'exp-002', name: 'Airtime + data bundle', amount: 199, category: 'Subscriptions', date: '2026-09-02' },
  { id: 'exp-003', name: 'Taxi fare top-up', amount: 120, category: 'Transport', date: '2026-09-04' },
  { id: 'exp-004', name: 'Printing + stationery', amount: 185, category: 'Education', date: '2026-09-06' },
  { id: 'exp-005', name: 'Fresh produce market', amount: 210, category: 'Food', date: '2026-09-08' },
  { id: 'exp-006', name: 'Movie night', amount: 155, category: 'Entertainment', date: '2026-09-10' },
  { id: 'exp-007', name: 'Concert ticket', amount: 200, category: 'Entertainment', date: '2026-09-12' },
  { id: 'exp-008', name: 'Taxi fare top-up', amount: 110, category: 'Transport', date: '2026-09-13' },
  { id: 'exp-009', name: 'Textbook (2nd hand)', amount: 450, category: 'Education', date: '2026-09-15' },
  { id: 'exp-010', name: 'Winter jacket', amount: 750, category: 'Shopping', date: '2026-09-17' },
]

/* --------------------------------- goals --------------------------------- */

export const DEMO_GOALS = [
  {
    id: 'goal-laptop',
    name: 'Refurbished laptop',
    target: 9000,
    saved: 2400,
    targetDate: '2026-12-15',
    note: 'For 2nd-year programming courses.',
  },
  {
    id: 'goal-emergency',
    name: 'Emergency buffer',
    target: 3000,
    saved: 1450,
    targetDate: '2027-02-28',
    note: 'One month of essentials as a safety net.',
  },
  {
    id: 'goal-trip',
    name: 'Travel home after exams',
    target: 1600,
    saved: 250,
    targetDate: '2026-11-30',
    note: 'Bus ticket plus spending money.',
  },
]

/* ----------------------------- subscriptions ----------------------------- */

export const DEMO_SUBSCRIPTIONS = [
  {
    id: 'sub-music',
    name: 'Music streaming (student plan)',
    amount: 65,
    billingCycle: 'monthly',
    nextBillingDate: '2026-09-28',
  },
  {
    id: 'sub-video',
    name: 'Video streaming (shared)',
    amount: 199,
    billingCycle: 'monthly',
    nextBillingDate: '2026-09-30',
  },
  {
    id: 'sub-cloud',
    name: 'Cloud storage 200GB',
    amount: 480,
    billingCycle: 'yearly',
    nextBillingDate: '2027-01-12',
  },
  {
    id: 'sub-audiobook',
    name: 'Audiobook service',
    amount: 130,
    billingCycle: 'monthly',
    nextBillingDate: '2026-10-05',
  },
]

/* --------------------------- planned expenses ----------------------------- */

/** Upcoming expenses the user has scheduled but not yet paid. */
export const DEMO_PLANNED_EXPENSES = [
  {
    id: 'plan-001',
    name: 'Monthly rent',
    amount: 1800,
    category: 'Other',
    date: '2026-10-01',
    notes: 'Paid on the 1st each month.',
  },
  {
    id: 'plan-002',
    name: 'Study tour deposit',
    amount: 500,
    category: 'Education',
    date: '2026-10-15',
    notes: 'Deposit holds the spot; balance due in November.',
  },
  {
    id: 'plan-003',
    name: 'Data bundle top-up',
    amount: 199,
    category: 'Subscriptions',
    date: '2026-09-26',
    notes: '',
  },
]

/* ------------------------- smart shopping (demo) ------------------------- */

/**
 * Clearly-labeled demo product comparison data. These are NOT live search
 * results — no store or price API is connected in this phase. Prices,
 * ratings, and delivery estimates are illustrative examples only.
 */
export const DEMO_PRODUCTS = [
  {
    id: 'prod-001',
    name: 'Refurb laptop — 16GB / 512GB',
    store: 'Certified Refurb Co.',
    price: 9000,
    previousPrice: 10500,
    rating: 4.5,
    deliveryDays: 4,
    note: '12-month warranty, battery replaced',
  },
  {
    id: 'prod-002',
    name: 'New laptop B — 8GB / 256GB',
    store: 'Campus Electronics',
    price: 11500,
    previousPrice: 11500,
    rating: 4.2,
    deliveryDays: 2,
    note: 'Full retail, 24-month warranty',
  },
  {
    id: 'prod-003',
    name: 'Refurb laptop — 8GB / 256GB',
    store: 'StudentTech Market',
    price: 7200,
    previousPrice: 8400,
    rating: 3.9,
    deliveryDays: 7,
    note: '6-month warranty, cosmetic wear',
  },
]

export const DEMO_DEALS = [
  { id: 'deal-001', store: 'Student Dice', title: 'Software bundle — 60% student discount', category: 'Software', endsInDays: 9 },
  { id: 'deal-002', store: 'Vodashop', title: 'Data bundle promo — double data', category: 'Connectivity', endsInDays: 4 },
  { id: 'deal-003', store: 'Campus print shop', title: 'Printing half-price Fridays', category: 'Study', endsInDays: 2 },
]

/* ----------------------------- learning hub ------------------------------ */

export const DEMO_LESSONS = [
  {
    id: 'lesson-budgeting',
    topic: 'Budgeting',
    minutes: 3,
    summary: 'A budget is a plan you write before the month starts, not a diary you keep afterwards.',
    body: [
      'Start with income you can rely on. Variable income (tips, freelance gigs) is best treated as a bonus, not as rent money.',
      'List fixed costs first: rent, data, transport. They set the floor of your month.',
      'Give every rand a job — savings is a job too, not whatever happens to be left over.',
      'Track for one full month without judging yourself. The goal is information, not guilt.',
    ],
  },
  {
    id: 'lesson-saving',
    topic: 'Saving',
    minutes: 3,
    summary: 'Saving works when it is automatic. Willpower is a bad monthly plan.',
    body: [
      'Pay yourself first: move savings out on the day money arrives, before spending decisions begin.',
      'Name your goals. "Save more" loses to "R900 laptop fund" every time.',
      'Start small and consistent — R50 every week beats R400 once, eventually.',
      'Keep savings slightly inconvenient: a separate account you do not carry a card for.',
    ],
  },
  {
    id: 'lesson-emergency-funds',
    topic: 'Emergency Funds',
    minutes: 2,
    summary: 'An emergency fund turns a crisis into an inconvenience.',
    body: [
      'Aim for one month of essentials first, then build toward three.',
      'Essentials only: rent, food, transport, data. Not the lifestyle you enjoy at your best.',
      'Keep it liquid — instant access, no lock-in, even if the interest is boring.',
      'Refill it after you use it. An emergency fund is a buffer, not a one-time trophy.',
    ],
  },
  {
    id: 'lesson-inflation',
    topic: 'Inflation',
    minutes: 3,
    summary: 'Inflation is the quiet tax that makes money under the mattress shrink.',
    body: [
      'At 6% inflation, R100 buys roughly R94 worth of goods a year from now.',
      'Cash loses value over time; that is why "doing nothing" is also a financial decision.',
      'Salaries, grants, and bursaries can lag inflation — worth noticing at renewal time.',
      'For students, the best inflation fighter is usually skills: earning power grows faster than prices.',
    ],
  },
  {
    id: 'lesson-compound-interest',
    topic: 'Compound Interest',
    minutes: 4,
    summary: 'Compounding is interest earning interest. Time is the main ingredient.',
    body: [
      'Simple interest pays on what you put in. Compound interest pays on everything so far.',
      'R1,000 at 10% becomes R1,100 after a year — and R2,594 after ten, without adding a cent.',
      'The same math works against you on debt: unpaid balances grow the same way.',
      'This is why starting early matters more than starting big.',
    ],
  },
  {
    id: 'lesson-mutual-funds',
    topic: 'Mutual Funds',
    minutes: 3,
    summary: 'A mutual fund pools money from many people to buy a spread of investments.',
    body: [
      'You buy units; a professional team manages what the fund owns.',
      'Pooling means small amounts can own a slice of hundreds of companies.',
      'Funds charge fees — check the total expense ratio, because fees compound too.',
      'Funds range from cautious (bonds, cash) to aggressive (equities). Match the fund to your timeline.',
    ],
  },
  {
    id: 'lesson-sip',
    topic: 'SIP Basics',
    minutes: 3,
    summary: 'A Systematic Investment Plan invests a fixed amount on a fixed schedule.',
    body: [
      'The same amount buys more units when prices are low, fewer when high — averaging your entry.',
      'Automation removes the temptation to time the market.',
      'Small, boring, repeated: R200 a month is a valid SIP.',
      'The habit matters more than the amount when you are starting out.',
    ],
  },
  {
    id: 'lesson-stocks',
    topic: 'Stocks',
    minutes: 3,
    summary: 'A stock is a small piece of ownership in a real business.',
    body: [
      'Share prices move with the business and with sentiment — short-term noise is normal.',
      'You can win two ways: price growth and, for some companies, dividends.',
      'Single stocks are concentrated risk; one company can fall hard and stay down.',
      'Only invest money you will not need for years, and never borrowed money.',
    ],
  },
  {
    id: 'lesson-diversification',
    topic: 'Diversification',
    minutes: 2,
    summary: 'Diversification means not betting everything on one outcome.',
    body: [
      'Spreading money across companies, sectors, and asset types softens any single failure.',
      'A useful student analogy: enroll in more than one module\'s worth of plan B.',
      'Funds and ETFs do the spreading for you — that is part of what their fees buy.',
      'Diversification reduces risk, not work: still review what you own twice a year.',
    ],
  },
  {
    id: 'lesson-risk-return',
    topic: 'Risk vs Return',
    minutes: 3,
    summary: 'Every extra percent of expected return comes with extra chance of loss.',
    body: [
      'Cash is safe and low-return. Stocks swing but historically return more over long periods.',
      'If an offer promises high returns with no risk, the risk is being hidden from you.',
      'Match risk to time: money needed next month belongs in cash; money needed in year five can ride waves.',
      'Your risk appetite is personal — sleep matters more than squeezing the last percent.',
    ],
  },
]

/* ---------------------------- static guidance ---------------------------- */

/**
 * Decision-support "advisor" script. Rules are deterministic and clearly
 * labeled as heuristic guidance — never guarantees. Data comes only from
 * values the user has entered or edited in the app.
 */
export const DEMO_ADVISOR_TIPS = [
  'Compare at least two options before any purchase over one week of income.',
  'Cancel one unused subscription per month and redirect it to your active goal.',
  'Keep one month of essentials as a buffer before accelerating any goal.',
  'Re-check your balance the day after big one-off expenses, not at month end.',
]

/**
 * Ghost assistant conversation starter — a clearly-labeled EXAMPLE exchange
 * showing the interaction pattern. Not a live AI, not real conversation
 * history. Ghost answers are rule-based and computed from local state at runtime.
 */
export const DEMO_GHOST_CONVERSATION = [
  { id: 'demo-1', role: 'user', text: 'How am I doing this month?' },
  { id: 'demo-2', role: 'ghost', text: 'This is an example exchange so you can see how I work. Ask me anything about your month and I will answer from your own numbers — no AI model involved.' },
]
