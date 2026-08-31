CREATE TABLE IF NOT EXISTS public.selftest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  triggered_by text,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  failed_count int NOT NULL DEFAULT 0,
  autofixes jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  alerted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_selftest_runs_started_at ON public.selftest_runs (started_at DESC);

GRANT SELECT ON public.selftest_runs TO authenticated;
GRANT ALL ON public.selftest_runs TO service_role;

ALTER TABLE public.selftest_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view selftest_runs" ON public.selftest_runs;
CREATE POLICY "Admins can view selftest_runs"
  ON public.selftest_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.selftest_autofix()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_applied text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.building_blocks') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.building_blocks TO anon, authenticated';
    v_applied := v_applied || 'select:building_blocks';
  END IF;
  IF to_regclass('public.building_block_components') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.building_block_components TO anon, authenticated';
    v_applied := v_applied || 'select:building_block_components';
  END IF;
  IF to_regclass('public.partners_public') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.partners_public TO anon, authenticated';
    v_applied := v_applied || 'select:partners_public';
  END IF;
  IF to_regclass('public.pricing_structures') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.pricing_structures TO anon, authenticated';
    v_applied := v_applied || 'select:pricing_structures';
  END IF;
  IF to_regclass('public.google_reviews_cache') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.google_reviews_cache TO anon, authenticated';
    v_applied := v_applied || 'select:google_reviews_cache';
  END IF;

  BEGIN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.submit_self_service_program_request(jsonb, jsonb) TO anon, authenticated, service_role';
    v_applied := v_applied || 'execute:submit_self_service_program_request';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_shared_program(text) TO anon, authenticated';
    v_applied := v_applied || 'execute:get_shared_program';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.append_customer_program_history(uuid, text, text, text, jsonb) TO anon, authenticated';
    v_applied := v_applied || 'execute:append_customer_program_history';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('applied', to_jsonb(v_applied));
END;
$$;

REVOKE ALL ON FUNCTION public.selftest_autofix() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.selftest_autofix() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('critical-selftest-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'critical-selftest-daily',
  '45 5 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://blhspuifehausilnzwio.supabase.co/functions/v1/critical-selftest',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaHNwdWlmZWhhdXNpbG56d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTM0NDAsImV4cCI6MjA3ODg4OTQ0MH0.shiugYb4lLf9KHksbfLx5bZYgtvfoGPSoWUyl3dONRI"}'::jsonb,
    body := '{"triggeredBy":"cron"}'::jsonb
  );
  $cron$
);