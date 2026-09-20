# GhostFinEx Agent Instructions

## Project
GhostFinEx is a student-focused financial decision-support application.

Core principle:

Educate → Explain → Compare → Recommend options → Let the user decide.

## Current Development Phase

We are currently building the frontend.

Focus on:
- React
- Vite
- JavaScript
- Tailwind CSS
- Reusable components
- Responsive UI
- Local/mock data

Do NOT implement Supabase, authentication, backend APIs, RAG, or external APIs unless explicitly requested.

## Financial Logic

Financial calculations must be deterministic and handled by application code.

Do NOT ask an AI model to calculate:
- balances
- budgets
- remaining money
- savings progress
- affordability
- expense totals

AI may explain results, but application logic is the source of truth.

## UX

GhostFinEx should feel:
- modern
- premium
- intelligent
- student-friendly
- trustworthy
- responsive

Avoid:
- childish designs
- excessive animations
- fake financial claims
- unnecessary complexity

Users must be able to enter and edit their own financial values.

## Architecture

Prefer reusable components.

Keep financial calculations separate from UI components where practical.

Avoid creating unnecessarily large components.

Use clear naming and maintainable structure.

## Data

For the current frontend phase, use local state/mock data.

Do not create fake API integrations.

Clearly separate demo/mock data from future API data.

## AI

AI is a decision-support layer, not the source of financial truth.

The application should never pretend that AI-generated financial information is guaranteed to be correct.

## Development

Before making major architectural changes:
1. Inspect the existing project.
2. Reuse existing components where appropriate.
3. Avoid unnecessary rewrites.
4. Explain significant changes.

Do not delete working functionality without a clear reason.

## Git

Do not automatically commit or push changes unless explicitly requested.

Keep changes logically grouped so they can be reviewed and committed as meaningful milestones.
