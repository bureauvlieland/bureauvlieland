drop function if exists public.get_scheduled_job_health();

create function public.get_scheduled_job_health()
returns table (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  last_run_start timestamptz,
  last_run_status text,
  last_http_status integer,
  last_http_error text,
  outcome text,
  runs_last_24h integer,
  failures_last_7d integer
)
language plpgsql
stable
security definer
set search_path = public, cron, pg_catalog
as $$
begin
  if not (current_user = 'service_role' or public.is_admin(auth.uid())) then
    raise exception 'Alleen admins mogen de taakstatus opvragen';
  end if;

  return query
  with runs as (
    select d.jobid, d.start_time, d.status,
           row_number() over (partition by d.jobid order by d.start_time desc) as rn
    from cron.job_run_details d
  ),
  last_run as (
    select r.jobid, r.start_time, r.status from runs r where r.rn = 1
  ),
  run_counts as (
    select r.jobid, count(*)::int as cnt
    from cron.job_run_details r
    where r.start_time > now() - interval '24 hours'
    group by r.jobid
  ),
  dispatch as (
    select l.jobname, l.http_status, l.response_error, l.dispatched_at,
           row_number() over (partition by l.jobname order by l.dispatched_at desc) as rn
    from public.cron_dispatch_log l
  ),
  last_dispatch as (
    select d.jobname, d.http_status, d.response_error, d.dispatched_at
    from dispatch d where d.rn = 1
  ),
  fails as (
    select l.jobname, count(*)::int as cnt
    from public.cron_dispatch_log l
    where l.dispatched_at > now() - interval '7 days'
      and (l.http_status is null or l.http_status >= 400 or l.response_error is not null)
      and l.resolved_at is not null
    group by l.jobname
  )
  select j.jobid,
         j.jobname::text,
         j.schedule::text,
         j.active,
         lr.start_time,
         lr.status::text,
         ld.http_status,
         ld.response_error,
         case
           when lr.start_time is null then 'nooit_gedraaid'
           when lr.status is distinct from 'succeeded' then 'aanroep_mislukt'
           when ld.http_status is null and ld.response_error is null then 'onbekend'
           when ld.response_error is not null then 'fout'
           when ld.http_status >= 400 then 'fout'
           when ld.http_status between 200 and 299 then 'ok'
           else 'onbekend'
         end::text as outcome,
         coalesce(rc.cnt, 0),
         coalesce(f.cnt, 0)
  from cron.job j
  left join last_run lr on lr.jobid = j.jobid
  left join run_counts rc on rc.jobid = j.jobid
  left join last_dispatch ld on ld.jobname = j.jobname
  left join fails f on f.jobname = j.jobname
  order by j.jobid;
end;
$$;

revoke all on function public.get_scheduled_job_health() from public;
grant execute on function public.get_scheduled_job_health() to authenticated, service_role;