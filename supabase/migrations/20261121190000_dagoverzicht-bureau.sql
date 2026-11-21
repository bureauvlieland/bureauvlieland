-- Notificaties fase 4 (docs/plan-notificaties.md, §5 Fase 4): dagelijkse
-- samenvatting voor het bureau. Eén mail per ochtend met wat er gisteren
-- binnenkwam, wat vandaag verloopt, wat langer dan drie dagen open staat en
-- hoeveel mails gisteren niet aankwamen. Gaat ook als er niets is.
--
-- 06:30 UTC is 07:30 Nederlandse wintertijd en 08:30 zomertijd; pg_cron kent
-- geen tijdzone. Zelfde vorm als de andere jobs (docs/deployen.md, "Valkuil:
-- cron-jobs"): anon key als apikey én Bearer, twee minuten wachttijd,
-- registratie in cron_dispatch_log zodat de watchdog de uitkomst ziet.

select cron.unschedule('send-bureau-daily-digest-daily')
 where exists (select 1 from cron.job where jobname = 'send-bureau-daily-digest-daily');

select cron.schedule(
  'send-bureau-daily-digest-daily',
  '30 6 * * *',
  $cron$
  insert into public.cron_dispatch_log (jobname, request_id)
  select 'send-bureau-daily-digest-daily', net.http_post(
    timeout_milliseconds := 120000,
    url := 'https://utshmnyrjzwtrpttxdlw.supabase.co/functions/v1/send-bureau-daily-digest',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0c2htbnlyanp3dHJwdHR4ZGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3OTEwMTksImV4cCI6MjEwNDM2NzAxOX0.FR8Ia5dJaNtoL5yGBhiidmW1VKR1gvl-B29C7JnpZ9I","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0c2htbnlyanp3dHJwdHR4ZGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3OTEwMTksImV4cCI6MjEwNDM2NzAxOX0.FR8Ia5dJaNtoL5yGBhiidmW1VKR1gvl-B29C7JnpZ9I"}'::jsonb,
    body := '{"triggeredBy":"cron"}'::jsonb
  );
  $cron$
);
