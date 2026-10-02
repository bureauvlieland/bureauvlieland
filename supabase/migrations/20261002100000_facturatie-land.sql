-- Klantportaal fase 3: het land van het factuuradres. Het portaal controleert
-- postcode, btw-nummer en registratienummer per land, zodat ook een Belgische
-- of Duitse klant zijn facturatiegegevens kan opslaan en ondertekenen.
alter table public.program_requests
  add column if not exists billing_country text not null default 'NL';

comment on column public.program_requests.billing_country is
  'Landcode (ISO 3166-1 alpha-2) van het factuuradres; XX voor een ander land.';
