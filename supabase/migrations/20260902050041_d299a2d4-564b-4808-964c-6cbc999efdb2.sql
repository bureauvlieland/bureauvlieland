-- 1. Uitkomstenlogboek voor geplande taken.
create table if not exists public.cron_dispatch_log (
  id uuid primary key default gen_random_uuid(),
  jobname text not null,
  request_id bigint,
  dispatched_at timestamptz not null default now(),
  http_status integer,
  response_error text,
  resolved_at timestamptz
);

create index if not exists idx_cron_dispatch_log_job_time
  on public.cron_dispatch_log (jobname, dispatched_at desc);

grant select on public.cron_dispatch_log to authenticated;
grant all on public.cron_dispatch_log to service_role;

alter table public.cron_dispatch_log enable row level security;

drop policy if exists "Admins kunnen taakuitkomsten lezen" on public.cron_dispatch_log;
create policy "Admins kunnen taakuitkomsten lezen"
  on public.cron_dispatch_log for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- 2. Resolver: vult de echte HTTP-uitkomst in zolang net._http_response die nog heeft.
create or replace function public.resolve_cron_dispatches()
returns integer
language plpgsql
security definer
set search_path = public, net, pg_catalog
as $$
declare
  v_count integer;
begin
  with upd as (
    update public.cron_dispatch_log d
       set http_status = r.status_code,
           response_error = nullif(r.error_msg, ''),
           resolved_at = now()
      from net._http_response r
     where r.id = d.request_id
       and d.resolved_at is null
    returning d.id
  )
  select count(*) into v_count from upd;

  update public.cron_dispatch_log
     set resolved_at = now(),
         response_error = coalesce(response_error, 'uitkomst onbekend (responsbewaartermijn verstreken)')
   where resolved_at is null
     and dispatched_at < now() - interval '2 hours';

  delete from public.cron_dispatch_log
   where dispatched_at < now() - interval '90 days';

  return v_count;
end;
$$;

revoke all on function public.resolve_cron_dispatches() from public;
grant execute on function public.resolve_cron_dispatches() to service_role;