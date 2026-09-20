/**
 * mockData.js — DEMO / MOCK DATA ONLY.
 *
 * ⚠️ Everything in this file is static sample data for the frontend
 * prototype. It is NOT fetched from any API, and none of these numbers are
 * real user data. When a backend is introduced, these objects define the
 * shape the API will return and will be replaced by real queries.
 *
 * Mock seed values keep the prototype deterministic: the same numbers are
 * shown on every fresh load so calculations can be verified by hand.
 */

export const DEMO_PROFILE = {
  displayName: 'Demo Student',
  currency: 'ZAR',
  monthlyIncome: 4200,
  incomeSources: [
    { id: 'src-parttime', label: 'Part-time job', monthlyAmount: 3200 },
    { id: 'src-allowance', label: 'Family allowance', monthlyAmount: 700 },
    { id: 'src-bursary', label: 'Bursary stipend', monthlyAmount: 300 },
  ],
}

export const DEMO_BUDGET_LINES = [
  { id: 'bud-rent', category: 'Rent & utilities', planned: 1800, spent: 1800 },
  { id: 'bud-groceries', category: 'Groceries', planned: 1200, spent: 1130 },
  { id: 'bud-transport', category: 'Transport', planned: 350, spent: 410 },
  { id: 'bud-study', category: 'Study materials', planned: 250, spent: 120 },
  { id: 'bud-fun', category: 'Social & entertainment', planned: 300, spent: 355 },
  { id: 'bud-phone', category: 'Phone & data', planned: 200, spent: 199 },
]

export const DEMO_GOALS = [
  {
    id: 'goal-laptop',
    name: 'Refurbished laptop',
    target: 9000,
    saved: 2400,
    deadline: '2026-12-15',
    note: 'For 2nd-year programming courses.',
  },
  {
    id: 'goal-emergency',
    name: 'Emergency buffer',
    target: 3000,
    saved: 1450,
    deadline: '2027-02-28',
    note: 'One month of essentials as a safety net.',
  },
  {
    id: 'goal-examtrip',
    name: 'Travel home after exams',
    target: 1600,
    saved: 250,
    deadline: '2026-11-30',
    note: 'Bus ticket plus spending money.',
  },
]

export const DEMO_SUBSCRIPTIONS = [
  {
    id: 'sub-music',
    name: 'Music streaming (student plan)',
    amount: 65,
    billingCycle: 'monthly',
    usesPerMonth: 20,
    lastUsed: '2026-09-18',
    notes: '',
  },
  {
    id: 'sub-video',
    name: 'Video streaming (shared)',
    amount: 199,
    billingCycle: 'monthly',
    usesPerMonth: 6,
    lastUsed: '2026-09-14',
    notes: 'Shared with two flatmates.',
  },
  {
    id: 'sub-cloud',
    name: 'Cloud storage 200GB',
    amount: 480,
    billingCycle: 'yearly',
    usesPerMonth: 12,
    lastUsed: '2026-09-19',
    notes: 'Renews in January.',
  },
  {
    id: 'sub-audiobook',
    name: 'Audiobook service',
    amount: 130,
    billingCycle: 'monthly',
    usesPerMonth: 2,
    lastUsed: '2026-06-30',
    notes: 'Barely used since June.',
  },
]

export const DEMO_COMPARISON_OPTIONS = [
  {
    id: 'opt-laptop-a',
    name: 'Refurb A — 16GB / 512GB',
    purchasePrice: 9000,
    warrantyMonths: 12,
    pros: ['Full keyboard and screen coverage', 'Battery replaced'],
    cons: ['Older chassis', 'Heavier'],
    note: 'Certified refurbisher with 12-month warranty.',
  },
  {
    id: 'opt-laptop-b',
    name: 'New B — 8GB / 256GB',
    purchasePrice: 11500,
    warrantyMonths: 24,
    pros: ['Brand-new battery', 'Longer warranty'],
    cons: ['Less RAM', 'Smaller storage'],
    note: 'Retail price, no negotiation room.',
  },
  {
    id: 'opt-laptop-c',
    name: 'Campus loaner + saving',
    purchasePrice: 0,
    warrantyMonths: 0,
    pros: ['No upfront cost', 'Keeps the emergency buffer growing'],
    cons: ['Limited availability', 'Must return at year-end'],
    note: 'Delay the purchase; keep saving monthly.',
  },
]

export const DEMO_LESSONS = [
  {
    id: 'lesson-budget',
    title: 'Where does the money go?',
    minutes: 3,
    summary:
      'A budget is a plan you write before the month starts, not a diary you keep afterwards.',
    body: [
      'Start with income you can rely on. Variable income (tips, freelance gigs) is best treated as a bonus, not as rent money.',
      'List fixed costs first: rent, data, transport. They set the floor of your month.',
      'Give every rand a job — savings is a job too, not whatever happens to be left over.',
      'Track for one full month without judging yourself. The goal is information, not guilt.',
    ],
  },
  {
    id: 'lesson-subscriptions',
    title: 'The subscription drift',
    minutes: 2,
    summary:
      'Small monthly charges compound quietly. The fix is a routine, not willpower.',
    body: [
      'List every recurring charge and its monthly cost, normalized across billing cycles.',
      'Compute cost per use: a R199 service used twice a month costs about R100 per session.',
      'Cancel on a schedule — the last day of each month — so the decision is routine, not dramatic.',
      'Pause before re-subscribing: a two-week gap tells you whether you actually missed it.',
    ],
  },
  {
    id: 'lesson-goals',
    title: 'Goals that survive contact with real life',
    minutes: 3,
    summary: 'A goal without a deadline and a weekly number is a wish.',
    body: [
      'Name the target amount and the date. Both are required.',
      'Divide the gap by the weeks remaining. That weekly number is the honest price of the goal.',
      'Automate the transfer on the day money arrives — before spending decisions begin.',
      'If the weekly number is impossible, change the date, not the habit.',
    ],
  },
  {
    id: 'lesson-credit',
    title: 'Student loans without the fog',
    minutes: 4,
    summary: 'Interest is rent paid on borrowed time. Length and rate drive the total.',
    body: [
      'The monthly payment depends on three numbers: principal, rate, and term.',
      'Shorter terms raise the payment but cut total interest sharply.',
      'Even a small extra payment early on reduces the balance that future interest is charged on.',
      'Always compare total cost of the loan, never the monthly payment alone.',
    ],
  },
]

/**
 * Decision-support "advisor" script. Rules are deterministic and clearly
 * labeled as heuristic guidance — never guarantees. Data comes only from
 * values the user has entered or edited in the app.
 */
export const DEMO_ADVISOR_TIPS = [
  'Compare at least two options before any purchase over one week of income.',
  'Cancel one unused subscription per month and redirect it to your active goal.',
  'Keep one month of essentials as a buffer before accelerating any goal.',
  'Re-check your budget the day after big one-off expenses, not at month end.',
]

/* ------------------------------------------------------------------ */
/* Prototype ledger data (current month = September 2026)              */
/* ------------------------------------------------------------------ */

export const DEMO_EXPENSES = [
  { id: 'exp-001', date: '2026-09-01', category: 'Rent & utilities', note: 'Flat rent', amount: 1800 },
  { id: 'exp-002', date: '2026-09-02', category: 'Phone & data', note: 'Airtime + data bundle', amount: 199 },
  { id: 'exp-003', date: '2026-09-04', category: 'Groceries', note: 'Weekly shop — Checkers', amount: 460 },
  { id: 'exp-004', date: '2026-09-06', category: 'Transport', note: 'Taxi fare top-up', amount: 120 },
  { id: 'exp-005', date: '2026-09-08', category: 'Groceries', note: 'Fresh produce market', amount: 210 },
  { id: 'exp-006', date: '2026-09-10', category: 'Social & entertainment', note: 'Movie night', amount: 155 },
  { id: 'exp-007', date: '2026-09-12', category: 'Study materials', note: 'Printing + stationery', amount: 120 },
  { id: 'exp-008', date: '2026-09-13', category: 'Transport', note: 'Taxi fare top-up', amount: 110 },
  { id: 'exp-009', date: '2026-09-15', category: 'Groceries', note: 'Weekly shop — PnP', amount: 460 },
  { id: 'exp-010', date: '2026-09-17', category: 'Social & entertainment', note: 'Concert ticket', amount: 200 },
]

export const DEMO_ACTIVITY = [
  { id: 'act-001', date: '2026-09-18', kind: 'goal', label: 'Deposit added to Refurbished laptop', detail: '+R 250', tone: 'accent' },
  { id: 'act-002', date: '2026-09-15', kind: 'expense', label: 'Groceries — weekly shop', detail: 'R 460', tone: 'neutral' },
  { id: 'act-003', date: '2026-09-14', kind: 'subscription', label: 'Video streaming payment', detail: 'R 199', tone: 'neutral' },
  { id: 'act-004', date: '2026-09-12', kind: 'insight', label: 'Transport marked over plan', detail: 'R 60 over', tone: 'warn' },
  { id: 'act-005', date: '2026-09-01', kind: 'budget', label: 'Budget plan created for September', detail: '6 categories', tone: 'info' },
]

export const DEMO_SHOPPING_ITEMS = [
  {
    id: 'shop-001',
    name: 'Noise-cancelling study headphones',
    category: 'Electronics',
    currentPrice: 2499,
    targetPrice: 1999,
    store: 'Takealot',
    notes: 'Wait for a month-end sale.',
  },
  {
    id: 'shop-002',
    name: 'Reference manager — textbooks',
    category: 'Study',
    currentPrice: 899,
    targetPrice: 650,
    store: 'Campus bookstore',
    notes: 'Ask about student discount.',
  },
  {
    id: 'shop-003',
    name: 'Winter jacket',
    category: 'Clothing',
    currentPrice: 750,
    targetPrice: 550,
    store: 'Mr Price',
    notes: '',
  },
]

export const DEMO_DEALS = [
  { id: 'deal-001', store: 'Student Dice', title: 'Software bundle — 60% student discount', category: 'Software', endsInDays: 9 },
  { id: 'deal-002', store: 'Vodashop', title: 'Data bundle promo — double data', category: 'Connectivity', endsInDays: 4 },
  { id: 'deal-003', store: 'Campus print shop', title: 'Printing half-price Fridays', category: 'Study', endsInDays: 2 },
]

/** Upcoming subscription renewals (demo mirrors subscription amounts). */
export const DEMO_RENEWALS = [
  { id: 'ren-001', date: '2026-09-28', name: 'Music streaming (student plan)', amount: 65 },
  { id: 'ren-002', date: '2026-09-30', name: 'Video streaming (shared)', amount: 199 },
  { id: 'ren-003', date: '2026-10-12', name: 'Cloud storage 200GB', amount: 480 },
  { id: 'ren-004', date: '2026-10-05', name: 'Audiobook service', amount: 130 },
]
