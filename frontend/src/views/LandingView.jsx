/**
 * LandingView.jsx — the public landing page for GhostFinEx.
 *
 * A single self-contained view: hero, problem, features, how-it-works,
 * architecture, learning, trust, CTA, footer. It reuses the app's design
 * tokens (--gfx-*), icons, buttons, and the REAL demo data + finance.js
 * calculations for the product visual — no fake screenshots, no invented
 * numbers, no fabricated stats anywhere on the page.
 *
 * CTA behavior (integrated with existing auth — no second auth system):
 *   - "Start with GhostFinEx" → #account (the existing AuthView). App-level
 *     routing sends authenticated users straight to the dashboard instead.
 *   - "Explore the features" → scrolls to the features section in-page.
 *
 * Motion: one IntersectionObserver-driven reveal, gated on
 * prefers-reduced-motion (and disabled entirely when the API is missing).
 */

import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Primitives.jsx'
import {
  IconBook,
  IconGhost,
  IconScale,
  IconSliders,
  IconSparkle,
  IconTag,
  IconTarget,
  IconWallet,
} from '../components/ui/icons.jsx'
import { DEMO_EXPENSES, DEMO_PROFILE } from '../data/mockData.js'
import { deriveOverview, expensesByCategory } from '../lib/finance.js'
import { formatCurrency, formatPercent } from '../lib/format.js'

/* ---------------------------------- data ---------------------------------- */

const FEATURES = [
  {
    icon: IconWallet,
    title: 'Track your money',
    body: 'Accounts, expenses, and a live financial overview — every figure recalculates from the values you enter.',
    tone: 'accent',
  },
  {
    icon: IconTarget,
    title: 'Build savings goals',
    body: 'Name what you\'re saving for, set a target, and watch contributions turn a wish into a plan.',
    tone: 'info',
  },
  {
    icon: IconScale,
    title: 'Can I afford this?',
    body: 'See exactly how a purchase affects your available money and the savings goals it would delay.',
    tone: 'violet',
  },
  {
    icon: IconSliders,
    title: 'What-if planning',
    body: 'Explore scenarios before you decide — nothing you simulate ever changes your real numbers.',
    tone: 'warn',
  },
  {
    icon: IconTag,
    title: 'Smart shopping',
    body: 'Compare demo options in-app, or search current web information with sources shown.',
    tone: 'pink',
  },
  {
    icon: IconBook,
    title: 'Learn & grow',
    body: 'Short lessons, plain-language glossary, and a curated book list — education, not product placement.',
    tone: 'accent',
  },
  {
    icon: IconGhost,
    title: 'Ask Ghost',
    body: 'Your ghost that reads your own numbers and explains them — routing each question to the right data source.',
    tone: 'info',
  },
]

const STEPS = [
  { num: '01', title: 'Track', body: 'Understand where your money goes.' },
  { num: '02', title: 'Plan', body: 'Set budgets and savings goals.' },
  { num: '03', title: 'Explore', body: 'Compare purchases and financial scenarios.' },
  { num: '04', title: 'Decide', body: 'Understand the trade-offs — and make your own decision.' },
]

const PIPELINE = [
  { label: 'Your data', tool: 'Supabase', detail: 'Your records, protected by authenticated access.' },
  { label: 'Your calculations', tool: 'finance.js', detail: 'Deterministic math in application code — same input, same answer, every time.' },
  { label: 'Your knowledge', tool: 'RAG', detail: 'A curated financial-education library behind the lessons and answers.' },
  { label: 'AI explanation', tool: 'Hugging Face', detail: 'Explains and summarizes — it never calculates your money.' },
  { label: 'Current web info', tool: 'Tavily', detail: 'Live product and price research, shown with sources.' },
]

const LEARNING_POINTS = [
  'Learn personal finance in five-minute lessons',
  'Build better habits with tools that show cause and effect',
  'Explore useful books — recommendations, not advertisements',
]

const TRUST_POINTS = [
  { title: 'Deterministic calculations', body: 'Every financial figure comes from the same application math — same inputs, same answer. No AI invents your balance.' },
  { title: 'Authenticated access', body: 'Your records live in your own account, protected by Supabase authentication and row-level security.' },
  { title: 'AI explains, you decide', body: 'AI summarizes and explains — it never calculates your money or makes choices for you.' },
  { title: 'No pressure, no predictions', body: 'No fake urgency, no promised returns, no "act now." Just clear numbers and your call.' },
]

const TONE_STYLES = {
  accent: { icon: 'text-[var(--gfx-accent)]', ring: 'group-hover:border-[rgba(52,211,153,0.4)]', soft: 'bg-[var(--gfx-accent-soft)]' },
  info: { icon: 'text-[var(--gfx-info)]', ring: 'group-hover:border-[rgba(96,165,250,0.4)]', soft: 'bg-[var(--gfx-info-soft)]' },
  violet: { icon: 'text-[var(--gfx-violet)]', ring: 'group-hover:border-[rgba(167,139,250,0.4)]', soft: 'bg-[var(--gfx-violet-soft)]' },
  warn: { icon: 'text-[var(--gfx-warn)]', ring: 'group-hover:border-[rgba(251,191,36,0.4)]', soft: 'bg-[var(--gfx-warn-soft)]' },
  pink: { icon: 'text-[var(--gfx-pink)]', ring: 'group-hover:border-[rgba(244,114,182,0.4)]', soft: 'bg-[var(--gfx-pink-soft)]' },
}

/* ------------------------------ reveal hook ------------------------------- */

/*
 * Reveal — scrolls an element into view with a gentle rise+fade.
 *
 * The reduced-motion path needs no state at all: the element starts fully
 * visible via the hook's initial value, computed once (matchMedia in the
 * lazy initializer is fine — it's read-time browser state, like the URL).
 * setState only ever happens inside the IntersectionObserver callback,
 * never synchronously in an effect body.
 */
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(prefersReducedMotion)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (visible || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  return [ref, visible]
}

function Reveal({ as: Tag = 'div', className = '', delay = 0, children }) {
  const [ref, visible] = useReveal()
  return (
    <Tag
      ref={ref}
      className={`${className} transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      style={visible && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}

/* ---------------------------- product visual ------------------------------ */

/**
 * Live mini-dashboard rendered from the same demo seed + finance.js the app
 * uses — the visual shows the real product's real numbers, not a mock-up.
 */
function ProductVisual() {
  const overview = deriveOverview({ profile: DEMO_PROFILE, expenses: DEMO_EXPENSES })
  const topCategories = expensesByCategory(DEMO_EXPENSES)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
  const headroom = overview.budgetRemaining

  return (
    <div className="relative mx-auto w-full max-w-lg" aria-hidden="true">
      <div className="rounded-2xl border border-[var(--gfx-border-strong)] bg-[var(--gfx-surface)] p-5 shadow-[var(--gfx-shadow-lg)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--gfx-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gfx-accent-strong)] to-[var(--gfx-info)] text-xs font-bold text-[var(--gfx-accent-ink)]">
              G
            </span>
            <span className="text-sm font-semibold text-[var(--gfx-text)]">GhostFinEx</span>
          </div>
          <span className="rounded-full border border-[rgba(52,211,153,0.35)] bg-[var(--gfx-accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--gfx-accent)]">
            Live demo data
          </span>
        </div>

        <div className="pt-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--gfx-muted)]">
            Available balance
          </p>
          <p className="tabular mt-1 text-3xl font-semibold tracking-tight text-[var(--gfx-accent)]">
            {formatCurrency(overview.availableBalance)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--gfx-muted)]">
            Money held right now · {formatCurrency(overview.monthSpent, { compact: true })} spent this month
          </p>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-[var(--gfx-muted)]">Budget used</span>
              <span className="tabular text-[var(--gfx-faint)]">{formatPercent(overview.budgetUsed)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--gfx-surface-3)]">
              <div
                className="h-full rounded-full bg-[var(--gfx-accent-strong)]"
                style={{ width: `${Math.min(100, Math.max(0, overview.budgetUsed * 100))}%` }}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-[var(--gfx-border)] pt-3">
            {topCategories.map((entry) => (
              <div key={entry.category} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--gfx-muted)]">{entry.category}</span>
                <span className="tabular text-[var(--gfx-text)]">{formatCurrency(entry.total, { compact: true })}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-3">
            <IconGhost className="h-4 w-4 shrink-0 text-[var(--gfx-accent)]" />
            <p className="text-xs text-[var(--gfx-muted)]">
              "You've used {formatPercent(overview.budgetUsed)} of this month's budget —{' '}
              {formatCurrency(headroom)} of headroom left."
            </p>
          </div>
        </div>
      </div>

      {/* Soft accent glow behind the card — static, no animation */}
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(closest-side,rgba(52,211,153,0.13),transparent)]"
        aria-hidden="true"
      />
    </div>
  )
}

/* --------------------------------- page ----------------------------------- */

export default function LandingView({ onNavigate }) {
  const featuresRef = useRef(null)

  const goAccount = () => onNavigate('account')
  const goDashboard = () => onNavigate('dashboard')
  const goFeatures = () => featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div id="main-content" tabIndex={-1} className="min-h-screen bg-[var(--gfx-bg)] outline-none">
      {/* ------------------------------- HERO ------------------------------ */}
      <header className="relative overflow-hidden">
        <nav
          aria-label="Landing navigation"
          className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gfx-accent-strong)] to-[var(--gfx-info)] text-sm font-bold text-[var(--gfx-accent-ink)]" aria-hidden="true">
              G
            </span>
            <span className="text-sm font-semibold tracking-tight text-[var(--gfx-text)]">GhostFinEx</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goFeatures}>
              Features
            </Button>
            <Button variant="secondary" size="sm" onClick={goAccount}>
              Sign in
            </Button>
          </div>
        </nav>

        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pb-24 lg:pt-16">
          <div>
            <Reveal>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--gfx-border)] bg-[var(--gfx-surface)] px-3 py-1 text-xs text-[var(--gfx-muted)]">
                <IconSparkle className="h-3.5 w-3.5 text-[var(--gfx-accent)]" />
                For students who want their money to make sense
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--gfx-text)] sm:text-5xl">
                Your money.{' '}
                <span className="text-[var(--gfx-accent)]">Your goals.</span>{' '}
                Your decisions.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--gfx-muted)]">
                GhostFinEx helps students understand where their money goes, plan where it should
                go, and make smarter everyday financial decisions.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={goAccount} className="px-6">
                  Start with GhostFinEx
                </Button>
                <Button size="lg" variant="secondary" onClick={goFeatures}>
                  Explore the features
                </Button>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <p className="mt-6 max-w-md text-xs leading-relaxed text-[var(--gfx-faint)]">
                Free to explore in demo mode — no account needed to look around. GhostFinEx is
                decision support, not a bank, broker, or investment advisor.
              </p>
            </Reveal>
          </div>

          <Reveal delay={200} className="lg:justify-self-end">
            <ProductVisual />
          </Reveal>
        </div>
      </header>

      {/* ----------------------------- PROBLEM ----------------------------- */}
      <Section id="problem" ariaLabelledby="problem-heading">
        <Reveal>
          <h2 id="problem-heading" className="text-2xl font-semibold tracking-tight text-[var(--gfx-text)] sm:text-3xl">
            Sound familiar?
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--gfx-muted)]">
            Money disappears. Subscriptions pile up quietly. Savings goals get forgotten by week
            three. And a purchase that looked affordable in the store can look very different when
            the rest of the month arrives.
          </p>
          <p className="mt-3 max-w-2xl text-[var(--gfx-muted)]">
            GhostFinEx brings the pieces together — your spending, your plans, your options — so
            you can see the whole picture before you decide.
          </p>
        </Reveal>
      </Section>

      {/* ---------------------------- FEATURES ----------------------------- */}
      <Section id="features" ariaLabelledby="features-heading" refTarget={featuresRef}>
        <Reveal>
          <h2 id="features-heading" className="text-2xl font-semibold tracking-tight text-[var(--gfx-text)] sm:text-3xl">
            Everything in one place
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--gfx-muted)]">
            Seven tools that cover the full loop: track, plan, explore, decide — and learn from it.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} delay={index * 60} />
          ))}
        </div>
      </Section>

      {/* --------------------------- HOW IT WORKS -------------------------- */}
      <Section id="how-it-works" ariaLabelledby="how-heading">
        <Reveal>
          <h2 id="how-heading" className="text-2xl font-semibold tracking-tight text-[var(--gfx-text)] sm:text-3xl">
            How it works
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--gfx-muted)]">
            Four steps, one loop. The more you use it, the clearer your month becomes.
          </p>
        </Reveal>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.num} delay={index * 80} className="rounded-2xl border border-[var(--gfx-border)] bg-[var(--gfx-surface)] p-5">
              <span className="text-xs font-semibold tracking-widest text-[var(--gfx-accent)]">{step.num}</span>
              <h3 className="mt-2 text-base font-semibold text-[var(--gfx-text)]">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--gfx-muted)]">{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* ------------------------- AI ARCHITECTURE -------------------------- */}
      <Section id="architecture" ariaLabelledby="arch-heading">
        <Reveal>
          <h2 id="arch-heading" className="text-2xl font-semibold tracking-tight text-[var(--gfx-text)] sm:text-3xl">
            Different problems need different tools
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--gfx-muted)]">
            GhostFinEx doesn't hand one AI model your finances and hope for the best. Each layer
            does one job — and your money math never comes from AI.
          </p>
        </Reveal>
        <ol className="mt-10 space-y-3">
          {PIPELINE.map((row, index) => (
            <Reveal as="li" key={row.tool} delay={index * 60}>
              <div className="flex flex-col gap-1 rounded-2xl border border-[var(--gfx-border)] bg-[var(--gfx-surface)] p-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--gfx-surface-3)] text-xs font-semibold text-[var(--gfx-faint)]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--gfx-text)]">{row.label}</p>
                    <p className="truncate text-xs text-[var(--gfx-muted)]">{row.detail}</p>
                  </div>
                </div>
                <span className="shrink-0 self-start rounded-lg border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--gfx-accent)] sm:self-center">
                  {row.tool}
                </span>
              </div>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* -------------------------- LEARNING + BOOKS ------------------------ */}
      <Section id="learning" ariaLabelledby="learn-heading">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <Reveal>
            <h2 id="learn-heading" className="text-2xl font-semibold tracking-tight text-[var(--gfx-text)] sm:text-3xl">
              Learn it, don't just track it
            </h2>
            <p className="mt-3 text-[var(--gfx-muted)]">
              The Learning Hub turns app data into understanding — ten short lessons, a
              plain-language glossary, and a curated book list that explains why each title may
              fit your learning goal.
            </p>
            <ul className="mt-5 space-y-2.5">
              {LEARNING_POINTS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--gfx-muted)]">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gfx-accent)]" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="rounded-2xl border border-[var(--gfx-border)] bg-[var(--gfx-surface)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gfx-accent)]">
                From the Learning Hub
              </p>
              <div className="mt-3 space-y-3">
                {[
                  { title: 'The Psychology of Money', author: 'Morgan Housel', why: 'Builds the behavioural vocabulary behind every budgeting decision.' },
                  { title: 'The Index Card', author: 'Helaine Olen and Harold Pollack', why: 'Personal finance that fits on an index card — an ideal first read.' },
                  { title: 'Millionaire Teacher', author: 'Andrew Hallam', why: 'The gentlest entry into fees, compounding, and diversification.' },
                ].map((book) => (
                  <div key={book.title} className="rounded-xl border border-[var(--gfx-border)] bg-[var(--gfx-surface-2)] p-3.5">
                    <p className="text-sm font-medium text-[var(--gfx-text)]">{book.title}</p>
                    <p className="text-xs text-[var(--gfx-faint)]">{book.author}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--gfx-muted)]">{book.why}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--gfx-faint)]">
                GhostFinEx doesn't sell books or take payment for any title — what you read is
                entirely your call.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ------------------------------ TRUST ------------------------------ */}
      <Section id="trust" ariaLabelledby="trust-heading">
        <Reveal>
          <h2 id="trust-heading" className="text-2xl font-semibold tracking-tight text-[var(--gfx-text)] sm:text-3xl">
            Built to help you decide, not decide for you
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TRUST_POINTS.map((item, index) => (
            <Reveal key={item.title} delay={index * 60} className="h-full">
              <div className="h-full rounded-2xl border border-[var(--gfx-border)] bg-[var(--gfx-surface)] p-5">
                <h3 className="text-sm font-semibold text-[var(--gfx-text)]">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--gfx-muted)]">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ------------------------------- CTA ------------------------------- */}
      <Section id="cta" ariaLabelledby="cta-heading">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-[var(--gfx-border-strong)] bg-[var(--gfx-surface)] px-6 py-12 text-center sm:px-12">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(52,211,153,0.5)] to-transparent" aria-hidden="true" />
            <h2 id="cta-heading" className="text-2xl font-semibold tracking-tight text-[var(--gfx-text)] sm:text-3xl">
              Ready to understand your money better?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--gfx-muted)]">
              Explore the demo in one click — or create an account and your data becomes yours,
              synced and private.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={goAccount} className="px-6">
                Start with GhostFinEx
              </Button>
              <Button size="lg" variant="secondary" onClick={goDashboard}>
                Explore the app
              </Button>
            </div>
            <p className="mt-6 text-xs text-[var(--gfx-faint)]">
              Decision support — not financial advice.
            </p>
          </div>
        </Reveal>
      </Section>

      {/* ------------------------------ FOOTER ------------------------------ */}
      <footer className="border-t border-[var(--gfx-border)]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gfx-accent-strong)] to-[var(--gfx-info)] text-sm font-bold text-[var(--gfx-accent-ink)]" aria-hidden="true">
                G
              </span>
              <span className="text-sm font-semibold text-[var(--gfx-text)]">GhostFinEx</span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-[var(--gfx-muted)]">
              Financial decision support for students. Track, plan, explore, decide — and learn
              the language of money along the way.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gfx-faint)]">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              {FEATURES.slice(0, 4).map((feature) => (
                <li key={feature.title}>
                  <button type="button" onClick={goFeatures} className="text-[var(--gfx-muted)] transition-colors hover:text-[var(--gfx-text)]">
                    {feature.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gfx-faint)]">Learning</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button type="button" onClick={goFeatures} className="text-[var(--gfx-muted)] transition-colors hover:text-[var(--gfx-text)]">
                  Features overview
                </button>
              </li>
              <li>
                <button type="button" onClick={goAccount} className="text-[var(--gfx-muted)] transition-colors hover:text-[var(--gfx-text)]">
                  Sign in
                </button>
              </li>
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-[var(--gfx-faint)]">
              No external links are fabricated — in-app destinations only.
            </p>
          </div>
        </div>
        <div className="border-t border-[var(--gfx-border)]">
          <p className="mx-auto w-full max-w-6xl px-4 py-4 text-[11px] text-[var(--gfx-faint)] sm:px-6">
            GhostFinEx — decision support, not financial advice. Educate → Explain → Compare →
            Recommend options → You decide.
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------- fragments -------------------------------- */

function Section({ id, ariaLabelledby, refTarget, children }) {
  return (
    <section ref={refTarget} id={id} aria-labelledby={ariaLabelledby} className="mx-auto w-full max-w-6xl scroll-mt-6 px-4 py-14 sm:px-6 sm:py-16">
      {children}
    </section>
  )
}

function FeatureCard({ feature, delay }) {
  const tone = TONE_STYLES[feature.tone] ?? TONE_STYLES.accent
  const IconComponent = feature.icon
  return (
    <Reveal delay={delay} className="h-full">
      <div className={`group h-full rounded-2xl border border-[var(--gfx-border)] bg-[var(--gfx-surface)] p-5 transition-colors ${tone.ring}`}>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone.soft}`}>
          <IconComponent className={`h-4 w-4 ${tone.icon}`} />
        </span>
        <h3 className="mt-3 text-base font-semibold text-[var(--gfx-text)]">{feature.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--gfx-muted)]">{feature.body}</p>
      </div>
    </Reveal>
  )
}

function IconCheck({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  )
}
