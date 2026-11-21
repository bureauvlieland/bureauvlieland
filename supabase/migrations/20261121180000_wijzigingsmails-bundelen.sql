-- Wijzigingsmails bundelen per ontvanger per dag (docs/plan-notificaties.md,
-- fase 3). De "programma bijgewerkt"-mails (item_changes_customer en
-- item_changes_partner) gingen per publicatie of per klantwijziging: 122 mails
-- in 180 dagen, 14 tot 23% geopend, drie mails als Erwin drie keer op een dag
-- publiceert. publish-program-changes en update-customer-program zetten ze nu
-- in deze wachtrij; send-change-digest stuurt om 17:00 één mail per ontvanger
-- en dossier. Datumwijzigingen, nieuwe onderdelen die akkoord vragen en
-- annuleringen blijven direct gaan.

-- 1. Wachtrij --------------------------------------------------------------

create table if not exists public.pending_change_notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.program_requests(id) on delete cascade,
  recipient_kind text not null check (recipient_kind in ('customer', 'partner')),
  recipient_email text not null,
  partner_id text references public.partners(id) on delete set null,
  -- Kopgegevens en wijzigingsregels zoals de mail ze opbouwt; zie
  -- supabase/functions/_shared/changeDigest.ts (ChangeDigestPayload).
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  email_log_id uuid references public.email_log(id) on delete set null,
  -- Gevuld als de rij zonder mail is afgesloten (dossier geannuleerd,
  -- verwijderd of gearchiveerd voordat de bundel ging).
  skipped_reason text
);

comment on table public.pending_change_notifications is
  'Wachtrij voor de dagelijkse bundel van wijzigingsmails (send-change-digest). Alleen edge functions (service role) lezen en schrijven hier.';
comment on column public.pending_change_notifications.payload is
  'ChangeDigestPayload uit _shared/changeDigest.ts: referentie, aanhefnaam, wijzigingsregels, toelichting, portaallink.';
comment on column public.pending_change_notifications.skipped_reason is
  'request_cancelled, request_deleted, request_archived of request_missing: de rij is afgesloten zonder mail.';

create index if not exists idx_pending_change_notifications_sent_recipient
  on public.pending_change_notifications (sent_at, recipient_email);

-- Alleen de service role (de edge functions). Geen policies voor
-- authenticated: de admin ziet de uitkomst in email_log.
alter table public.pending_change_notifications enable row level security;
revoke all on public.pending_change_notifications from anon, authenticated;
grant all on public.pending_change_notifications to service_role;

-- 2. Cron om 17:00 Nederlandse tijd ------------------------------------------
--
-- pg_cron plant in UTC, zoals alle andere jobs hier (zie 20260908160000:
-- "04:30 UTC"). 16:00 UTC is 17:00 in de wintertijd en 18:00 in de zomertijd;
-- een uur later in de zomer is voor een dagbundel geen probleem. Zelfde
-- patroon als docs/deployen.md "Valkuil: cron-jobs": anon key als apikey én
-- Bearer, twee minuten wachttijd, registratie in cron_dispatch_log.

select cron.unschedule('send-change-digest-daily')
 where exists (select 1 from cron.job where jobname = 'send-change-digest-daily');

select cron.schedule('send-change-digest-daily', '0 16 * * *', $cron$
  insert into public.cron_dispatch_log (jobname, request_id)
  select 'send-change-digest-daily', net.http_post(
    timeout_milliseconds := 120000,
    url := 'https://utshmnyrjzwtrpttxdlw.supabase.co/functions/v1/send-change-digest',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0c2htbnlyanp3dHJwdHR4ZGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3OTEwMTksImV4cCI6MjEwNDM2NzAxOX0.FR8Ia5dJaNtoL5yGBhiidmW1VKR1gvl-B29C7JnpZ9I","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0c2htbnlyanp3dHJwdHR4ZGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3OTEwMTksImV4cCI6MjEwNDM2NzAxOX0.FR8Ia5dJaNtoL5yGBhiidmW1VKR1gvl-B29C7JnpZ9I"}'::jsonb,
    body := '{"triggeredBy":"cron"}'::jsonb
  );
$cron$);
