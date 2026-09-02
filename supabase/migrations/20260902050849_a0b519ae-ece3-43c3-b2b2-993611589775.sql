CREATE TABLE IF NOT EXISTS public.cron_job_first_seen (
  jobname text PRIMARY KEY,
  first_seen_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cron_job_first_seen TO authenticated;
GRANT ALL ON public.cron_job_first_seen TO service_role;

ALTER TABLE public.cron_job_first_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins kunnen eerste-registratie inzien"
ON public.cron_job_first_seen
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Bestaande taken zijn al langer bekend: backdate zodat ze meteen beoordeeld worden.
INSERT INTO public.cron_job_first_seen (jobname, first_seen_at)
SELECT j.jobname, coalesce(
         (select min(d.start_time) from cron.job_run_details d where d.jobid = j.jobid),
         now()
       )
FROM cron.job j
ON CONFLICT (jobname) DO NOTHING;