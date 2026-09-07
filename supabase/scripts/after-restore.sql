-- Eenmalig draaien in de SQL editor van het NIEUWE project, direct na pg_restore.
-- Stap 1: vul de twee vault-secrets in (zie docs/migratie-supabase.md).
--   select vault.create_secret('https://<nieuwe ref>.supabase.co', 'project_url');
--   select vault.create_secret('<nieuwe anon key>', 'anon_key');
--
-- Stap 2: dit script. Het laat zien welke cron-jobs nog naar het oude project
-- wijzen, en zet de twee bekende jobs opnieuw via invoke_edge_function.

-- Overzicht: alles wat nog 'blhspuifehausilnzwio' of een hardcoded supabase.co-URL bevat.
SELECT jobid, jobname, schedule, left(command, 120) AS command
FROM cron.job
WHERE command ILIKE '%supabase.co%'
ORDER BY jobname;

-- Helper: roept een edge function aan met URL en anon key uit Vault. Zo staat
-- er nergens meer een project-ref in een cron-job.
CREATE OR REPLACE FUNCTION public.invoke_edge_function(fn_name text, payload jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_key text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'anon_key' LIMIT 1;
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_edge_function(%): vault secrets project_url/anon_key ontbreken, niets gedaan', fn_name;
    RETURN NULL;
  END IF;
  SELECT net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/' || fn_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', v_key),
    body := payload
  ) INTO v_request_id;
  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_edge_function(text, jsonb) FROM public, anon, authenticated;


-- De twee jobs uit de repo opnieuw plannen via de helper (idempotent).
DO $$
BEGIN
  PERFORM cron.unschedule('critical-selftest-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule(
  'critical-selftest-daily', '45 5 * * *',
  $cron$ SELECT public.invoke_edge_function('critical-selftest', '{"triggeredBy":"cron"}'::jsonb); $cron$
);
DO $$
BEGIN
  PERFORM cron.unschedule('email-webhook-heartbeat-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule(
  'email-webhook-heartbeat-daily', '15 6 * * *',
  $cron$ SELECT public.invoke_edge_function('email-webhook-heartbeat', '{"triggeredBy":"cron"}'::jsonb); $cron$
);

-- Controle: de helper moet een request-id teruggeven (geen NULL/warning).
SELECT public.invoke_edge_function('email-webhook-heartbeat', '{"triggeredBy":"after-restore-check"}'::jsonb) AS request_id;

-- Storage: bestanden zelf staan niet in de dump; scripts/migrate-storage.ts kopieert ze.
SELECT bucket_id, count(*) AS objects FROM storage.objects GROUP BY bucket_id ORDER BY bucket_id;
