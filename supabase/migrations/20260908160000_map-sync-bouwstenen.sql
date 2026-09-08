-- Activiteitenaanbieders fase 3.1 (docs/plan-activiteitenaanbieders.md):
-- bouwstenen met een gekoppeld MAP-activiteitstype volgen 's nachts hun
-- bron (foto, tekst, duur). Prijs alleen als het bureau dat per bouwsteen
-- aanzet: de bureauprijs kan afwijken (commissie, groepstarief).

alter table public.building_blocks
  add column if not exists map_sync_price boolean not null default false,
  add column if not exists map_synced_at timestamptz,
  add column if not exists map_sync_error text;

comment on column public.building_blocks.map_sync_price is
  'Prijs per persoon uit MAP overnemen bij de nachtelijke synchronisatie (map-sync-blocks).';
comment on column public.building_blocks.map_synced_at is
  'Laatste geslaagde synchronisatie met het MAP-activiteitstype.';
comment on column public.building_blocks.map_sync_error is
  'Laatste fout bij synchroniseren; leeg na een geslaagde run.';

-- Nachtelijke run om 04:30 UTC, zelfde patroon als de andere cronjobs.
select cron.unschedule('map-sync-blocks-nightly')
 where exists (select 1 from cron.job where jobname = 'map-sync-blocks-nightly');

select cron.schedule(
  'map-sync-blocks-nightly',
  '30 4 * * *',
  $cron$
  insert into public.cron_dispatch_log (jobname, request_id) select 'map-sync-blocks-nightly', net.http_post(
    url := 'https://utshmnyrjzwtrpttxdlw.supabase.co/functions/v1/map-sync-blocks',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0c2htbnlyanp3dHJwdHR4ZGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3OTEwMTksImV4cCI6MjEwNDM2NzAxOX0.FR8Ia5dJaNtoL5yGBhiidmW1VKR1gvl-B29C7JnpZ9I"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $cron$
);
