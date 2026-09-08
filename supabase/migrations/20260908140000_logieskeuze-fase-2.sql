-- Logieskeuze fase 2: het datamodel completer (docs/plan-logieskeuze.md).
--
-- 1) Faciliteiten op accommodatieniveau, zelfde waarden als facilities_required
--    op de aanvraag, zodat de klant ziet of het aanbod op zijn wensen past.
-- 2) In- en uitchecktijd.
-- 3) Eigen foto's bij een specifieke offerte (optioneel; standaard de galerij
--    van het bedrijf).
--
-- De koppeling van een offerteregel aan het kamertype (room_type_id plus een
-- momentopname van naam, foto's, faciliteiten, bedden en m²) zit in de bestaande
-- jsonb-kolom accommodation_quotes.room_configuration; daar is geen
-- schemawijziging voor nodig.

alter table public.partners
  add column if not exists facilities text[] not null default '{}',
  add column if not exists check_in_time text,
  add column if not exists check_out_time text;

alter table public.partners
  drop constraint if exists partners_check_in_time_format,
  drop constraint if exists partners_check_out_time_format;
alter table public.partners
  add constraint partners_check_in_time_format
    check (check_in_time is null or check_in_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  add constraint partners_check_out_time_format
    check (check_out_time is null or check_out_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

comment on column public.partners.facilities is
  'Faciliteiten van de accommodatie; waarden uit FACILITIES in src/types/accommodation.ts (zelfde lijst als accommodation_requests.facilities_required).';
comment on column public.partners.check_in_time is 'Inchecken vanaf, "15:00".';
comment on column public.partners.check_out_time is 'Uitchecken tot, "10:30".';

alter table public.accommodation_quotes
  add column if not exists images jsonb not null default '[]'::jsonb;

alter table public.accommodation_quotes
  drop constraint if exists accommodation_quotes_images_is_array;
alter table public.accommodation_quotes
  add constraint accommodation_quotes_images_is_array
    check (jsonb_typeof(images) = 'array');

comment on column public.accommodation_quotes.images is
  'Foto''s specifiek voor deze aanbieding, [{url, alt}]; leeg = galerij van de partner tonen.';

-- De partnerview voor logiesaanvragen leest select * en hoeft niet aangepast;
-- partners_public bevat bewust geen faciliteiten (die horen bij het aanbod
-- aan een klant, niet bij de publieke partnerpagina).
