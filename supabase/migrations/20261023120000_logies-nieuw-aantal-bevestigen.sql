-- Aantalwijziging bij een gekozen logiesofferte (docs/plan-logies-aantalwijziging.md).
--
-- Tot nu toe kon een partner na de keuze van de klant niets meer aan zijn
-- offerte doen: de interface liet bij status "selected" geen prijswijziging
-- toe, en de enige route was de volledige reset naar "pending" (nieuwe
-- offerte, nieuwe keuze door de klant). Voor "10 wordt 8" is dat te zwaar.
-- Deze migratie legt vast voor hoeveel gasten een prijs geldt en biedt een
-- lichte bevestigingsronde: de partner stelt een nieuw totaal voor, het
-- bureau beoordeelt, de klant wordt geïnformeerd.
--
--   priced_for_guests             aantal gasten waarvoor price_total geldt;
--                                 wijkt dit af van number_of_guests van de
--                                 aanvraag, dan is er een bevestiging nodig
--   headcount_change_requested_at wanneer de partner om bevestiging is gevraagd
--                                 (notify-headcount-change-bulk); de herinnering
--                                 in check-pending-items rekent hiermee
--   headcount_proposal            het voorstel van de partner dat op het
--                                 bureau wacht: { price_total, guests,
--                                 previous_price_total, previous_guests,
--                                 room_configuration, note, proposed_at }
--   headcount_confirmed_at        laatste goedkeuring door het bureau
--
-- Alle schrijfacties lopen via edge functions (service role); voor
-- authenticated en anon zijn de kolommen alleen leesbaar.

ALTER TABLE public.accommodation_quotes
  ADD COLUMN IF NOT EXISTS priced_for_guests integer,
  ADD COLUMN IF NOT EXISTS headcount_change_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS headcount_proposal jsonb,
  ADD COLUMN IF NOT EXISTS headcount_confirmed_at timestamptz;

COMMENT ON COLUMN public.accommodation_quotes.priced_for_guests IS
  'Aantal gasten waarvoor price_total geldt. Afwijking van accommodation_requests.number_of_guests = bevestiging door de partner nodig.';
COMMENT ON COLUMN public.accommodation_quotes.headcount_change_requested_at IS
  'Wanneer de partner is gevraagd het nieuwe aantal te bevestigen (notify-headcount-change-bulk).';
COMMENT ON COLUMN public.accommodation_quotes.headcount_proposal IS
  'Voorstel van de partner na een aantalwijziging, in afwachting van beoordeling door het bureau (approve-accommodation-headcount).';
COMMENT ON COLUMN public.accommodation_quotes.headcount_confirmed_at IS
  'Laatste keer dat het bureau een aangepast totaal na een aantalwijziging heeft goedgekeurd.';

-- Backfill: price_per_person_per_night is bij indienen price_total / gasten /
-- nachten, dus het aantal gasten van destijds is daaruit exact terug te
-- rekenen. Lukt dat niet (geen p.p.p.n. of geen rond getal), dan nemen we het
-- huidige aantal van de aanvraag.
UPDATE public.accommodation_quotes q
SET priced_for_guests = sub.guests
FROM (
  SELECT
    q2.id,
    CASE
      WHEN q2.price_per_person_per_night > 0
       AND q2.price_total > 0
       AND abs(
             q2.price_total / (q2.price_per_person_per_night * GREATEST(1, r.departure_date - r.arrival_date))
             - round(q2.price_total / (q2.price_per_person_per_night * GREATEST(1, r.departure_date - r.arrival_date)))
           ) < 0.05
      THEN round(q2.price_total / (q2.price_per_person_per_night * GREATEST(1, r.departure_date - r.arrival_date)))::integer
      ELSE r.number_of_guests
    END AS guests
  FROM public.accommodation_quotes q2
  JOIN public.accommodation_requests r ON r.id = q2.request_id
  WHERE q2.submitted_at IS NOT NULL
) sub
WHERE sub.id = q.id
  AND q.priced_for_guests IS NULL;

-- Bij (opnieuw) indienen geldt de prijs voor het aantal gasten van dat moment.
-- De partner dient in vanuit de client (status -> submitted); een trigger
-- houdt de kolom bij zonder dat de client erbij hoeft te kunnen.
CREATE OR REPLACE FUNCTION public.set_priced_for_guests_on_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'submitted'
     AND (OLD.status IS DISTINCT FROM 'submitted'
          OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
          OR NEW.price_total IS DISTINCT FROM OLD.price_total)
  THEN
    SELECT r.number_of_guests INTO NEW.priced_for_guests
    FROM public.accommodation_requests r
    WHERE r.id = NEW.request_id;
    -- Een nieuwe prijs maakt een openstaand voorstel of verzoek overbodig.
    NEW.headcount_proposal := NULL;
    NEW.headcount_change_requested_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_priced_for_guests_on_submit ON public.accommodation_quotes;
CREATE TRIGGER trg_set_priced_for_guests_on_submit
  BEFORE UPDATE ON public.accommodation_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_priced_for_guests_on_submit();

REVOKE UPDATE (
  priced_for_guests,
  headcount_change_requested_at,
  headcount_proposal,
  headcount_confirmed_at
) ON public.accommodation_quotes FROM authenticated, anon;
