-- Enable pgvector
create extension if not exists vector;

-- =====================================================
-- 1. claudia_documents (RAG kennisbank)
-- =====================================================
create table if not exists public.claudia_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('building_block', 'program_template', 'partner', 'app_setting', 'note')),
  source_id text not null,
  content text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  model_version text not null default 'google/gemini-embedding-001',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists claudia_documents_embedding_idx
  on public.claudia_documents using hnsw (embedding vector_cosine_ops);

create index if not exists claudia_documents_source_type_idx
  on public.claudia_documents (source_type);

alter table public.claudia_documents enable row level security;

create policy "Admins can manage claudia documents"
on public.claudia_documents for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "Service role can manage claudia documents"
on public.claudia_documents for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create trigger trg_claudia_documents_updated_at
before update on public.claudia_documents
for each row execute function public.update_updated_at_column();

-- =====================================================
-- 2. admin_recommendations (dagelijkse Claudia output)
-- =====================================================
create table if not exists public.admin_recommendations (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  priority text not null default 'normal' check (priority in ('urgent', 'normal', 'info')),
  title text not null,
  body text not null,
  related_entity_type text,
  related_entity_id text,
  deeplink text,
  status text not null default 'open' check (status in ('open', 'done', 'dismissed', 'expired')),
  feedback text,
  feedback_at timestamptz,
  feedback_by uuid,
  source_signals jsonb not null default '{}'::jsonb,
  run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '36 hours')
);

create index if not exists admin_recommendations_status_idx
  on public.admin_recommendations (status, priority, created_at desc);

create index if not exists admin_recommendations_entity_idx
  on public.admin_recommendations (related_entity_type, related_entity_id);

alter table public.admin_recommendations enable row level security;

create policy "Admins can manage recommendations"
on public.admin_recommendations for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "Service role can insert recommendations"
on public.admin_recommendations for insert
to public
with check (auth.role() = 'service_role');

create policy "Service role can update recommendations"
on public.admin_recommendations for update
to public
using (auth.role() = 'service_role');

create trigger trg_admin_recommendations_updated_at
before update on public.admin_recommendations
for each row execute function public.update_updated_at_column();

-- =====================================================
-- 3. claudia_run_log (audit trail)
-- =====================================================
create table if not exists public.claudia_run_log (
  id uuid primary key default gen_random_uuid(),
  run_type text not null check (run_type in ('daily_scan', 'manual_scan', 'reindex', 'chat')),
  triggered_by uuid,
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  model text,
  input_summary jsonb,
  output_summary jsonb,
  recommendations_created int default 0,
  documents_indexed int default 0,
  duration_ms int,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists claudia_run_log_created_at_idx
  on public.claudia_run_log (created_at desc);

alter table public.claudia_run_log enable row level security;

create policy "Admins can view run log"
on public.claudia_run_log for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "Service role can manage run log"
on public.claudia_run_log for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- =====================================================
-- 4. Match function for RAG retrieval
-- =====================================================
create or replace function public.match_claudia_documents(
  query_embedding vector(1536),
  source_types text[] default null,
  match_count int default 8,
  min_similarity float default 0.4
)
returns table (
  id uuid,
  source_type text,
  source_id text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable security definer set search_path = public
as $$
  select
    d.id,
    d.source_type,
    d.source_id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.claudia_documents d
  where (source_types is null or d.source_type = any(source_types))
    and 1 - (d.embedding <=> query_embedding) >= min_similarity
  order by d.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

grant execute on function public.match_claudia_documents(vector, text[], int, float) to authenticated, service_role;

-- =====================================================
-- 5. Helper: auto-expire stale open recommendations
-- =====================================================
create or replace function public.expire_stale_recommendations()
returns void
language sql security definer set search_path = public
as $$
  update public.admin_recommendations
  set status = 'expired'
  where status = 'open'
    and expires_at < now();
$$;

grant execute on function public.expire_stale_recommendations() to service_role, authenticated;