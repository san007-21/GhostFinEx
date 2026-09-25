-- ============================================================================
-- GhostFinEx — RAG FOUNDATION: financial education knowledge base
--
-- SCOPE BOUNDARY (critical):
--   These tables hold GENERAL educational knowledge only. They are
--   application-owned, NOT user-owned. They must never contain user
--   financial records, and RAG retrieval must never substitute for the
--   deterministic calculations in frontend/lib/finance.js over the real
--   financial tables (accounts, expenses, savings_*).
--
-- EMBEDDING MODEL: Supabase/gte-small via the Edge Functions built-in AI
--   inference API (Supabase.ai.Session('gte-small')). Documented output:
--   384 dimensions, normalized vectors. vector(384) below matches that
--   model exactly — do not change one without the other.
--
-- IDEMPOTENT: safe to re-run (if-not-exists / drop-then-create / catalog
--   checks throughout, same conventions as schema.sql).
-- ============================================================================

-- pgvector: embedding storage + similarity operators ------------------------
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- financial_documents — one row per knowledge article
-- title is UNIQUE so ingestion is repeatable without duplicates.
-- ---------------------------------------------------------------------------
create table if not exists public.financial_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text,
  category text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_documents_title_key unique (title)
);

create index if not exists financial_documents_category_idx
  on public.financial_documents (category);

-- ---------------------------------------------------------------------------
-- financial_document_chunks — retrieval units (384-dim gte-small vectors)
-- (document_id, chunk_index) is UNIQUE: re-ingestion upserts, never dupes.
-- ---------------------------------------------------------------------------
create table if not exists public.financial_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.financial_documents (id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  embedding vector(384), -- filled by the rag-ingest Edge Function (gte-small)
  created_at timestamptz not null default now(),
  constraint financial_document_chunks_doc_idx_key unique (document_id, chunk_index)
);

create index if not exists financial_document_chunks_document_idx
  on public.financial_document_chunks (document_id);

-- ANN index for cosine similarity over normalized vectors (pgvector HNSW).
create index if not exists financial_document_chunks_embedding_idx
  on public.financial_document_chunks using hnsw (embedding vector_cosine_ops);

-- updated_at maintenance for documents ---------------------------------------
drop trigger if exists financial_documents_updated_at on public.financial_documents;
create trigger financial_documents_updated_at
  before update on public.financial_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — knowledge is READ-ONLY for authenticated users.
--
-- NOTE: `using (true)` below is scoped to authenticated SELECT on
-- application-owned knowledge — deliberately NOT the forbidden pattern of
-- public policies on user financial data. There are NO insert/update/delete
-- policies: only the service role (Edge Functions / SQL editor) can write
-- knowledge. Financial tables' policies are untouched by this file.
-- ---------------------------------------------------------------------------
alter table public.financial_documents enable row level security;
alter table public.financial_document_chunks enable row level security;

drop policy if exists financial_documents_read on public.financial_documents;
create policy financial_documents_read on public.financial_documents
  for select to authenticated
  using (true);

drop policy if exists financial_document_chunks_read on public.financial_document_chunks;
create policy financial_document_chunks_read on public.financial_document_chunks
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- match_financial_knowledge — semantic retrieval RPC.
-- Cosine similarity (1 - <=>) on normalized vectors; SECURITY INVOKER so the
-- caller's RLS always applies — retrieval can never bypass Supabase security.
-- Returns at most match_count chunks (keep 3–5; small and deterministic).
-- ( Renamed from the earlier match_financial_chunks; both names are dropped
--   here so re-running never leaves a stale duplicate. )
-- ---------------------------------------------------------------------------
drop function if exists public.match_financial_chunks(vector(384), double precision, integer);
drop function if exists public.match_financial_knowledge(vector(384), double precision, integer);

create function public.match_financial_knowledge(
  query_embedding vector(384),
  match_threshold double precision default 0.75,
  match_count integer default 4
)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  category text,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id                as chunk_id,
    c.document_id       as document_id,
    d.title             as title,
    d.category          as category,
    c.content           as content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.financial_document_chunks c
  join public.financial_documents d on d.id = c.document_id
  where c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= match_threshold
  order by c.embedding <=> query_embedding asc
  limit match_count;
$$;

revoke execute on function public.match_financial_knowledge(vector(384), double precision, integer) from public, anon;
grant execute on function public.match_financial_knowledge(vector(384), double precision, integer) to authenticated;
