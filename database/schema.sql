-- ============================================================================
-- GhostFinEx — Supabase schema (PostgreSQL)
--
-- Run once in the Supabase SQL Editor (or via `supabase db push` after moving
-- to migrations). Idempotent where practical: tables/indexes use IF NOT
-- EXISTS; policies/triggers/functions use drop-then-create so re-running is
-- safe.
--
-- Structure:
--   auth.users
--     └── profiles
--           ├── accounts
--           ├── expenses
--           ├── savings_goals
--           |       └── savings_contributions
--           ├── subscriptions
--           ├── planned_expenses
--           └── activity_log
--
-- Security model: RLS on every table; every policy pins to the caller's
-- auth.uid(). No public policies, no USING (true). Child records enforce
-- ownership by requiring their parent row (goal/account) to belong to the
-- same user — enforced both by FK to the parent table and by a composite FK
-- back to (id, user_id) so a cross-user parent id cannot even exist.
-- ============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user; id EQUALS auth.users.id
-- NOTE: no availableBalance column. Account balances are the source of truth
-- for money currently held (Phase 10).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  currency text,
  monthly_income numeric default 0,
  monthly_budget numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- accounts — where money is held
--
-- BALANCE SEMANTICS (MVP): `balance` is the CURRENT, manually maintained
-- amount the user holds in that account. Expenses and savings_contributions
-- are historical records — no trigger, rule, or application path mutates
-- account balances automatically. Available money for calculations is always
-- the sum of account balances (derived in frontend/lib/finance.js).
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null default 'bank',
  balance numeric not null default 0 check (balance >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- expenses — amount is a positive value; optional account attribution
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  description text not null,
  amount numeric not null check (amount > 0),
  category text not null,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- savings_goals — progress is DERIVED from contributions (no editable
-- current_saved column)
-- ---------------------------------------------------------------------------
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_amount numeric not null check (target_amount > 0),
  target_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- savings_contributions — the ONLY source of "actual savings".
-- Cross-user protection: goal must belong to the same user (composite FK to
-- the unique (id, user_id) pair), and the account too.
-- ---------------------------------------------------------------------------
create table if not exists public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Nullable: the Savings view supports "General savings" contributions that
  -- are not tied to any goal. NULL skips the composite ownership FK below
  -- (FKs apply only when the referencing column is non-NULL); RLS still
  -- scopes every row to its owner via user_id.
  goal_id uuid references public.savings_goals (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  amount numeric not null check (amount > 0),
  date date not null,
  note text,
  created_at timestamptz not null default now()
);

-- Uniqueness required for the composite ownership FK below.
create unique index if not exists savings_goals_id_user_idx
  on public.savings_goals (id, user_id);

-- A contribution may only ever point at the SAME user's goal (composite FK
-- makes a cross-user goal_id impossible to insert). Idempotent: catalog check
-- before create, because ADD CONSTRAINT has no IF NOT EXISTS.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'savings_contributions_goal_same_user_fk'
      and conrelid = 'public.savings_contributions'::regclass
  ) then
    alter table public.savings_contributions
      add constraint savings_contributions_goal_same_user_fk
      foreign key (goal_id, user_id) references public.savings_goals (id, user_id)
      on delete cascade;
  end if;
end $$;

-- For account references the composite-FK pattern cannot work (ON DELETE SET
-- NULL would need to null the NOT NULL user_id), so ownership is enforced by
-- the check_account_ownership trigger below instead. RLS remains the access
-- boundary either way.

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  name text not null,
  amount numeric not null check (amount > 0),
  billing_cycle text not null,
  next_date date,
  category text,
  status text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- planned_expenses
-- ---------------------------------------------------------------------------
create table if not exists public.planned_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  title text not null,
  amount numeric not null check (amount > 0),
  date date not null,
  category text,
  status text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- activity_log — append-only feed of user actions
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  message text,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Account-ownership guard: a row may only reference an account owned by the
-- same user (DB-enforced so a crafted account_id cannot cross users).
-- ---------------------------------------------------------------------------
create or replace function public.check_account_ownership()
returns trigger
language plpgsql
as $$
begin
  if new.account_id is not null then
    if not exists (
      select 1 from public.accounts a
      where a.id = new.account_id and a.user_id = new.user_id
    ) then
      raise exception 'account_id does not belong to the calling user'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists expenses_account_guard on public.expenses;
create trigger expenses_account_guard before insert or update on public.expenses
  for each row execute function public.check_account_ownership();

drop trigger if exists savings_contributions_account_guard on public.savings_contributions;
create trigger savings_contributions_account_guard before insert or update on public.savings_contributions
  for each row execute function public.check_account_ownership();

drop trigger if exists subscriptions_account_guard on public.subscriptions;
create trigger subscriptions_account_guard before insert or update on public.subscriptions
  for each row execute function public.check_account_ownership();

drop trigger if exists planned_expenses_account_guard on public.planned_expenses;
create trigger planned_expenses_account_guard before insert or update on public.planned_expenses
  for each row execute function public.check_account_ownership();

-- ============================================================================
-- PHASE 3 — INDEXES (user-scoped access patterns; nothing speculative)
-- ============================================================================
create index if not exists accounts_user_idx          on public.accounts (user_id);
create index if not exists expenses_user_idx          on public.expenses (user_id);
create index if not exists expenses_account_idx       on public.expenses (account_id);
create index if not exists expenses_date_idx          on public.expenses (date);
create index if not exists savings_goals_user_idx     on public.savings_goals (user_id);
create index if not exists savings_contributions_user_idx on public.savings_contributions (user_id);
create index if not exists savings_contributions_goal_idx on public.savings_contributions (goal_id);
create index if not exists subscriptions_user_idx     on public.subscriptions (user_id);
create index if not exists planned_expenses_user_idx  on public.planned_expenses (user_id);
create index if not exists planned_expenses_date_idx  on public.planned_expenses (date);
create index if not exists activity_log_user_idx      on public.activity_log (user_id);
create index if not exists activity_log_created_at_idx on public.activity_log (created_at);

-- ============================================================================
-- PHASE 4 — ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles             enable row level security;
alter table public.accounts             enable row level security;
alter table public.expenses             enable row level security;
alter table public.savings_goals        enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.planned_expenses     enable row level security;
alter table public.activity_log         enable row level security;

-- Helper: drop-then-create keeps this script re-runnable.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'accounts', 'expenses', 'savings_goals',
    'savings_contributions', 'subscriptions', 'planned_expenses', 'activity_log'
  ]
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
  end loop;
end $$;

-- profiles: key is auth.uid() = id -------------------------------------------------
create policy profiles_select on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_delete on public.profiles
  for delete using (false); -- profiles die with the auth user (cascade)

-- child tables: auth.uid() = user_id -----------------------------------------------
create policy accounts_select on public.accounts
  for select using (auth.uid() = user_id);
create policy accounts_insert on public.accounts
  for insert with check (auth.uid() = user_id);
create policy accounts_update on public.accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy accounts_delete on public.accounts
  for delete using (auth.uid() = user_id);

create policy expenses_select on public.expenses
  for select using (auth.uid() = user_id);
create policy expenses_insert on public.expenses
  for insert with check (auth.uid() = user_id);
create policy expenses_update on public.expenses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy expenses_delete on public.expenses
  for delete using (auth.uid() = user_id);

create policy savings_goals_select on public.savings_goals
  for select using (auth.uid() = user_id);
create policy savings_goals_insert on public.savings_goals
  for insert with check (auth.uid() = user_id);
create policy savings_goals_update on public.savings_goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy savings_goals_delete on public.savings_goals
  for delete using (auth.uid() = user_id);

create policy savings_contributions_select on public.savings_contributions
  for select using (auth.uid() = user_id);
create policy savings_contributions_insert on public.savings_contributions
  for insert with check (auth.uid() = user_id);
create policy savings_contributions_update on public.savings_contributions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy savings_contributions_delete on public.savings_contributions
  for delete using (auth.uid() = user_id);

create policy subscriptions_select on public.subscriptions
  for select using (auth.uid() = user_id);
create policy subscriptions_insert on public.subscriptions
  for insert with check (auth.uid() = user_id);
create policy subscriptions_update on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy subscriptions_delete on public.subscriptions
  for delete using (auth.uid() = user_id);

create policy planned_expenses_select on public.planned_expenses
  for select using (auth.uid() = user_id);
create policy planned_expenses_insert on public.planned_expenses
  for insert with check (auth.uid() = user_id);
create policy planned_expenses_update on public.planned_expenses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy planned_expenses_delete on public.planned_expenses
  for delete using (auth.uid() = user_id);

create policy activity_log_select on public.activity_log
  for select using (auth.uid() = user_id);
create policy activity_log_insert on public.activity_log
  for insert with check (auth.uid() = user_id);
-- activity_log is append-only: no update/delete policies on purpose.

-- ============================================================================
-- PHASE 5 — PROFILE CREATION
-- Database trigger on auth.users: safest way to guarantee every new user gets
-- a profiles row with id = auth.users.id, with no duplicates and no client
-- involvement. updated_at trigger excluded from profiles (owned by auth user).
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- updated_at maintenance for tables that carry the column
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'accounts', 'expenses', 'savings_goals',
    'subscriptions', 'planned_expenses'
  ]
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;
