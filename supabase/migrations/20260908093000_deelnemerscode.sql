-- Aparte deelnemerscode voor /programma-deelnemers/<code>.
--
-- Tot nu toe gebruikte de deelnemerspagina dezelfde code als de klantpagina
-- (/mijn-programma/<customer_token>): wie de deelnemerslink had, kon met één
-- padwijziging bij de klantpagina met prijzen, goedkeuring en chat. Elke
-- aanvraag krijgt nu een eigen participant_token; bestaande aanvragen krijgen
-- er meteen een (de default is volatile en wordt per rij berekend).
-- Bestaande deelnemerslinks met de oude code werken niet meer; de klant deelt
-- de nieuwe link vanuit de klantpagina.
alter table public.program_requests
  add column if not exists participant_token text not null
    default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists program_requests_participant_token_key
  on public.program_requests (participant_token);
