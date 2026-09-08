-- Eenmalig draaien op het NIEUWE project, direct na restore-from-lovable.sh.
-- Vier psql-variabelen zijn nodig:
--
--   psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 \
--     -v old_url='https://blhspuifehausilnzwio.supabase.co' \
--     -v new_url='https://<nieuwe ref>.supabase.co' \
--     -v old_key='<oude anon key, staat in .env als VITE_SUPABASE_PUBLISHABLE_KEY>' \
--     -v new_key='<nieuwe anon key>' \
--     -f supabase/scripts/after-restore.sql
--
-- Getest op de export van 7 september 2026 (lokale PostgreSQL 17).

\echo '== 1. Cron-jobs: oude URL en anon key vervangen (14 van de 16 jobs roepen een edge function aan)'
SELECT cron.alter_job(
  jobid,
  command := replace(replace(command, :'old_url', :'new_url'), :'old_key', :'new_key')
)
FROM cron.job
WHERE command LIKE '%' || :'old_url' || '%' OR command LIKE '%' || :'old_key' || '%';

SELECT count(*) AS jobs_nog_naar_oud_project
FROM cron.job
WHERE command LIKE '%' || :'old_url' || '%' OR command LIKE '%' || :'old_key' || '%';
-- Verwacht: 0

SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;
-- Verwacht: 16 jobs, allemaal active

\echo '== 1b. Cron-tellers gelijkzetten aan de teruggezette geschiedenis'
-- De datafase zet cron.job_run_details uit de export terug (runid tot ~3600),
-- maar de teller runid_seq blijft op de stand van het nieuwe project. Elke
-- nieuwe uitvoering botst dan op een bestaand nummer en de pg_cron-planner
-- crasht en herstart om de vijf minuten zonder ooit een job te draaien (zo
-- ging het in de nacht van 7 op 8 september 2026: geen enkele job gedraaid).
SELECT setval('cron.runid_seq', GREATEST((SELECT max(runid) FROM cron.job_run_details), 1));
SELECT setval('cron.jobid_seq', GREATEST((SELECT max(jobid) FROM cron.job), 1));
SELECT last_value AS runid_seq FROM cron.runid_seq;
-- Verwacht: gelijk aan max(runid) in cron.job_run_details

\echo '== 2. Migratiehistorie gelijk aan de repo (anders wil de CLI alle migraties opnieuw draaien)'
\i supabase/scripts/mark-migrations-applied.sql
SELECT count(*) AS migraties, max(version) FROM supabase_migrations.schema_migrations;
-- Verwacht: evenveel als bestanden in supabase/migrations/

\echo '== 3. Controles'
SELECT count(*) AS gebruikers, count(encrypted_password) AS met_wachtwoord FROM auth.users;
-- Verwacht (export 7 sep): 41 en 41. Zijn ze gelijk, dan kan iedereen gewoon inloggen.

SELECT bucket_id, count(*) AS objecten FROM storage.objects GROUP BY 1 ORDER BY 1;
-- Dit zijn de rijen; de bestanden zelf zet scripts/migrate-storage.ts erbij.
-- De buckets database_export_* zijn Lovable's eigen exportbestanden en hoeven niet mee.

SELECT count(*) AS wees_template_items
FROM public.program_template_items
WHERE template_id NOT IN (SELECT id FROM public.program_templates);
-- Verwacht: 0 (restore-from-lovable.sh heeft ze verwijderd)

SELECT conname FROM pg_constraint
WHERE conrelid = 'public.program_template_items'::regclass AND conname LIKE '%template_id%';
-- Verwacht: program_template_items_template_id_fkey
