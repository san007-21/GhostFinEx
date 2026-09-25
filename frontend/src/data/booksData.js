/**
 * booksData.js — curated book catalog for the Learning Hub (education only).
 *
 * EDITORIAL POLICY (deliberately strict):
 *   - Only well-established, widely known titles with publicly verifiable
 *     authors appear here. No ratings, no prices, no reviews, no fabricated
 *     publication details, no summaries of contents we cannot verify.
 *   - `whySuggested` is GhostFinEx's own editorial voice explaining which
 *     LEARNING TOPICS a book is known to cover. It never claims the book
 *     will solve the user's financial problems and never advises any
 *     investment action.
 *   - Current availability, formats, and purchase options are NOT stored
 *     here — those are exactly the things that go stale. When the user wants
 *     current information, the Books section fetches live web sources through
 *     the existing Tavily-backed search and shows them with attribution.
 *
 * `lessonIds` reference the Learning Hub lessons in mockData.js; the UI
 * resolves unknown ids gracefully, so the two lists can evolve separately.
 *
 * A future backend can replace this module with a real application-owned
 * `books` table (same spirit as the RAG knowledge documents) without any UI
 * change: the exported shape below is the contract.
 */

export const BOOK_CATEGORIES = [
  'Budgeting & Money Basics',
  'Saving & Personal Finance',
  'Financial Psychology',
  'Student Finance',
  'Investing Fundamentals',
  'Financial Decision Making',
  'Building Wealth',
  'Money Habits',
]

/** Category → short chip label for the filter row. */
export const CATEGORY_CHIP_LABELS = {
  'Budgeting & Money Basics': 'Budgeting',
  'Saving & Personal Finance': 'Saving',
  'Financial Psychology': 'Money Psychology',
  'Student Finance': 'Student Finance',
  'Investing Fundamentals': 'Investing Basics',
  'Financial Decision Making': 'Decision Making',
  'Building Wealth': 'Building Wealth',
  'Money Habits': 'Money Habits',
}

/**
 * The catalog. Fields:
 *   id, title, author, category,
 *   level ('Beginner' | 'Intermediate'),
 *   practicality ('practical' | 'balanced' | 'conceptual'),
 *   topics (search/compare tags), lessonIds (Learning Hub connections),
 *   description (neutral), whySuggested (editorial, topic-level).
 */
export const BOOKS = [
  {
    id: 'book-psycho-money',
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    category: 'Financial Psychology',
    level: 'Beginner',
    practicality: 'balanced',
    topics: ['money habits', 'financial psychology', 'saving behavior', 'decision making'],
    lessonIds: ['lesson-compound-interest', 'lesson-risk-return'],
    description:
      'Short essays on how people actually think about money — patience, luck, ego, and why sensible people still make poor money choices.',
    whySuggested:
      'Suggested when money habits and decision patterns are the learning goal: it builds the behavioural vocabulary (compounding patience, "enough", tail events) that makes budgeting and saving tools feel less abstract.',
  },
  {
    id: 'book-index-card',
    title: 'The Index Card',
    author: 'Helaine Olen and Harold Pollack',
    category: 'Budgeting & Money Basics',
    level: 'Beginner',
    practicality: 'practical',
    topics: ['money basics', 'budgeting', 'simple rules'],
    lessonIds: ['lesson-budgeting', 'lesson-saving'],
    description:
      'Personal-finance advice that famously fits on an index card: spend less than you earn, avoid expensive debt, automate the boring parts.',
    whySuggested:
      'A first book for absolute beginners: its small set of rules maps almost one-to-one onto the app\'s core loop (track, budget, save first), so each idea can be practised immediately in the app.',
  },
  {
    id: 'book-i-will-teach',
    title: 'I Will Teach You to Be Rich',
    author: 'Ramit Sethi',
    category: 'Money Habits',
    level: 'Beginner',
    practicality: 'practical',
    topics: ['automation', 'money habits', 'systems', 'conscious spending'],
    lessonIds: ['lesson-saving', 'lesson-budgeting'],
    description:
      'A systems-first guide: automate savings and bills, then spend consciously on what you actually value, without guilt-led micro-optimising.',
    whySuggested:
      'Suggested when the learning goal is repeatable systems rather than one-off fixes — its automation-first stance pairs with the app\'s recurring-cost tracking and "pay yourself first" lesson.',
  },
  {
    id: 'book-millionaire-teacher',
    title: 'Millionaire Teacher',
    author: 'Andrew Hallam',
    category: 'Investing Fundamentals',
    level: 'Beginner',
    practicality: 'balanced',
    topics: ['index investing', 'fees', 'long-term investing', 'diversification'],
    lessonIds: ['lesson-mutual-funds', 'lesson-diversification', 'lesson-stocks'],
    description:
      'A teacher\'s explanation of low-cost index investing: why fees compound against you, and how patience beats stock-picking for most long-horizon savers.',
    whySuggested:
      'The gentlest entry into the investing lessons: it explains fees and diversification in plain language before any product decisions — presented purely as education, not a recommendation to invest.',
  },
  {
    id: 'book-simple-path',
    title: 'The Simple Path to Wealth',
    author: 'JL Collins',
    category: 'Building Wealth',
    level: 'Beginner',
    practicality: 'balanced',
    topics: ['long-term investing', 'financial independence', 'simplicity'],
    lessonIds: ['lesson-compound-interest', 'lesson-risk-return'],
    description:
      'A letter-to-a-daughter style walkthrough of long-horizon wealth building: keep it simple, keep costs low, give compounding decades to work.',
    whySuggested:
      'Suggested when the learning goal is the long game: it reinforces the compound-interest lesson (time horizon, low fees) in a narrative form that suits readers who find textbooks dry.',
  },
  {
    id: 'book-atomic-habits',
    title: 'Atomic Habits',
    author: 'James Clear',
    category: 'Money Habits',
    level: 'Beginner',
    practicality: 'practical',
    topics: ['habit formation', 'systems', 'small changes'],
    lessonIds: ['lesson-budgeting', 'lesson-saving'],
    description:
      'Not a money book: the widely used framework for building small, repeatable habits — applied by many readers to saving and spending routines.',
    whySuggested:
      'Suggested when habit formation is the sticking point (saving happens once, then lapses): its cue–routine–reward framing applies directly to weekly money reviews and automated transfers.',
  },
  {
    id: 'book-automatic-millionaire',
    title: 'The Automatic Millionaire',
    author: 'David Bach',
    category: 'Saving & Personal Finance',
    level: 'Beginner',
    practicality: 'practical',
    topics: ['automation', 'saving', 'pay yourself first'],
    lessonIds: ['lesson-saving', 'lesson-emergency-funds'],
    description:
      'A short classic on making saving automatic — the "pay yourself first" idea, standing transfers, and the long-term cost of small leaks.',
    whySuggested:
      'Suggested when the Saving lesson resonates but execution keeps slipping: its one-move approach (automate the transfer on payday) matches the app\'s message that leftover cash only becomes savings when actually moved.',
  },
  {
    id: 'book-thinking-fast-slow',
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    category: 'Financial Decision Making',
    level: 'Intermediate',
    practicality: 'conceptual',
    topics: ['cognitive biases', 'decision making', 'risk perception'],
    lessonIds: ['lesson-risk-return'],
    description:
      'The foundational work on how humans actually decide — two thinking modes, loss aversion, overconfidence — by a Nobel-winning psychologist.',
    whySuggested:
      'The deeper cut on financial decision making: it explains WHY sale prices, sunk costs, and "sure things" mislead, which strengthens every comparison and what-if decision the app supports.',
  },
  {
    id: 'book-broke-millennial',
    title: 'Broke Millennial',
    author: 'Erin Lowry',
    category: 'Student Finance',
    level: 'Beginner',
    practicality: 'practical',
    topics: ['first job money', 'student finance', 'money conversations', 'renting'],
    lessonIds: ['lesson-budgeting', 'lesson-saving'],
    description:
      'First-account, first-job, first-rent money guidance written for people starting from zero — awkward money conversations included.',
    whySuggested:
      'For students setting up money life for the first time: its situations (first salary, splitting bills, flatmates) map directly onto the app\'s accounts, expenses, and subscription-tracking flows.',
  },
  {
    id: 'book-your-money-or-your-life',
    title: 'Your Money or Your Life',
    author: 'Vicki Robin and Joe Dominguez',
    category: 'Saving & Personal Finance',
    level: 'Intermediate',
    practicality: 'balanced',
    topics: ['spending awareness', 'life energy', 'values-based spending'],
    lessonIds: ['lesson-saving', 'lesson-budgeting', 'lesson-inflation'],
    description:
      'The classic on reframing spending as "life energy": tracking every rand to see what your work-hours actually buy, then choosing deliberately.',
    whySuggested:
      'Suggested when spending awareness is the goal — its hours-of-work framing deepens the opportunity-cost idea and turns the expense ledger into a values exercise rather than a guilt log.',
  },
]

/** Books matching an optional category + free-text topic query (deterministic). */
export function filterBooks({ category = '', query = '' } = {}) {
  const text = query.trim().toLowerCase()
  return BOOKS.filter((book) => {
    if (category && book.category !== category) return false
    if (!text) return true
    const haystack = [
      book.title,
      book.author,
      book.category,
      book.description,
      book.whySuggested,
      ...book.topics,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(text)
  })
}

/** Find one book by id (null when missing). */
export function findBook(id) {
  return BOOKS.find((book) => book.id === id) ?? null
}
