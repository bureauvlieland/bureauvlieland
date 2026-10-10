-- Klantportaal fase 3a (docs/plan-klantportaal-ontwerpsysteem.md): een
-- landveld bij de facturatiegegevens, zodat een Belgische of Duitse klant zijn
-- gegevens kan opslaan en de voorwaarden kan ondertekenen. De validatie van
-- postcode en btw-nummer volgt het land (src/lib/billingDetails.ts).
-- ISO 3166-1 alpha-2; bestaande projecten zijn Nederlands.

ALTER TABLE public.program_requests
  ADD COLUMN IF NOT EXISTS billing_country text NOT NULL DEFAULT 'NL';

ALTER TABLE public.program_requests
  ADD CONSTRAINT program_requests_billing_country_check
  CHECK (billing_country ~ '^[A-Z]{2}$');

COMMENT ON COLUMN public.program_requests.billing_country IS
  'Land van het factuuradres (ISO 3166-1 alpha-2), standaard NL.';
