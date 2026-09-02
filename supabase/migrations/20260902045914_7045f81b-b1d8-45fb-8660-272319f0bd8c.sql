create or replace function public.get_scheduled_job_health()
returns table (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  last_run_start timestamptz,
  last_run_status text,
  last_return_message text,
  last_http_status integer,
  last_http_error text,
  runs_last_24h integer
)
language plpgsql
stable
security definer
set search_path = public, cron, net, pg_catalog
as $$
begin
  if not (current_user = 'service_role' or public.is_admin(auth.uid())) then
    raise exception 'Alleen admins mogen de taakstatus opvragen';
  end if;

  return query
  with runs as (
    select d.jobid,
           d.start_time,
           d.status,
           d.return_message,
           row_number() over (partition by d.jobid order by d.start_time desc) as rn
    from cron.job_run_details d
  ),
  counts as (
    select r.jobid, count(*)::int as cnt
    from cron.job_run_details r
    where r.start_time > now() - interval '24 hours'
    group by r.jobid
  ),
  last_run as (
    select r.jobid, r.start_time, r.status, r.return_message
    from runs r where r.rn = 1
  ),
  http as (
    select (regexp_match(l.return_message, '(\d+)'))[1]::bigint as request_id, l.jobid
    from last_run l
    where l.return_message ~ '^\d+$'
  )
  select j.jobid,
         j.jobname::text,
         j.schedule::text,
         j.active,
         l.start_time,
         l.status::text,
         l.return_message::text,
         resp.status_code,
         nullif(resp.error_msg, '')::text,
         coalesce(c.cnt, 0)
  from cron.job j
  left join last_run l on l.jobid = j.jobid
  left join counts c on c.jobid = j.jobid
  left join http h on h.jobid = j.jobid
  left join net._http_response resp on resp.id = h.request_id
  order by j.jobid;
end;
$$;

revoke all on function public.get_scheduled_job_health() from public;
grant execute on function public.get_scheduled_job_health() to authenticated, service_role;