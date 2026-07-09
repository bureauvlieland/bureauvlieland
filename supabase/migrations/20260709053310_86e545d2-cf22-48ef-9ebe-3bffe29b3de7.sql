
CREATE TABLE IF NOT EXISTS public.auto_close_run_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','error')),
  dry_run boolean NOT NULL DEFAULT false,
  triggered_by text,
  result jsonb,
  error_message text,
  alerted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auto_close_run_log_started_at_idx
  ON public.auto_close_run_log (started_at DESC);

GRANT SELECT ON public.auto_close_run_log TO authenticated;
GRANT ALL ON public.auto_close_run_log TO service_role;

ALTER TABLE public.auto_close_run_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view auto_close_run_log"
  ON public.auto_close_run_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
