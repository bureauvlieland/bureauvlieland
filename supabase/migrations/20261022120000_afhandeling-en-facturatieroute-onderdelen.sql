-- Afhandeling en facturatieroute per programmaonderdeel.
--
-- Tot nu toe kende het partnerportaal één afhandelmodel: elk onderdeel is een
-- offertetraject (partner bevestigt mét prijs, bureau beoordeelt, partner
-- factureert aan Bureau Vlieland). Een restaurantreservering die op de
-- verblijfsnota van de partner zelf landt, past daar niet in: er is geen
-- offerte, geen prijs en geen partnerfactuur. Zo'n onderdeel bleef na de
-- uitvoerdatum hangen als "Afgesloten (automatisch)" met een reactieknop en
-- een facturatiewaarschuwing die nergens op sloeg.
--
-- partner_handling  wat we van de partner verwachten
--   quote     offerte/prijs indienen (huidige flow, default)
--   confirm   alleen bevestigen dat het geregeld is, zonder prijs
--   inform    ter kennisgeving, geen actie
--
-- billing_route  waar de kosten van dit onderdeel terechtkomen
--   bureau                via de factuur van Bureau Vlieland (default)
--   partner_stay_invoice  op de verblijfsnota/eigen nota van de partner
--   customer_direct       de klant rekent rechtstreeks met de partner af
--
-- De twee staan los van elkaar: Swagerman/Bravoure is confirm + partner_stay_invoice.

ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS partner_handling text NOT NULL DEFAULT 'quote',
  ADD COLUMN IF NOT EXISTS billing_route text NOT NULL DEFAULT 'bureau';

ALTER TABLE public.program_request_items
  DROP CONSTRAINT IF EXISTS program_request_items_partner_handling_check;
ALTER TABLE public.program_request_items
  ADD CONSTRAINT program_request_items_partner_handling_check
    CHECK (partner_handling IN ('quote', 'confirm', 'inform'));

ALTER TABLE public.program_request_items
  DROP CONSTRAINT IF EXISTS program_request_items_billing_route_check;
ALTER TABLE public.program_request_items
  ADD CONSTRAINT program_request_items_billing_route_check
    CHECK (billing_route IN ('bureau', 'partner_stay_invoice', 'customer_direct'));

COMMENT ON COLUMN public.program_request_items.partner_handling IS
  'Wat de partner met dit onderdeel moet: quote (offerte/prijs, default), confirm (alleen bevestigen, geen prijs), inform (ter kennisgeving, geen actie).';
COMMENT ON COLUMN public.program_request_items.billing_route IS
  'Waar de kosten landen: bureau (factuur Bureau Vlieland, default), partner_stay_invoice (op de verblijfsnota/eigen nota van de partner), customer_direct (klant rekent rechtstreeks af).';

-- Backfill: BV-2606-0013 "Diner in restaurant Bravoure" (Mevr. Swagerman,
-- 16 okt 2026). Reservering doorgegeven aan Hotel Bruin, gefactureerd op de
-- totaalnota van het verblijf, programma is geweest. Dus: bevestiging +
-- verblijfsnota, en direct op uitgevoerd zodat de kaart uit de actielijst
-- van de partner verdwijnt.
UPDATE public.program_request_items i
SET partner_handling = 'confirm',
    billing_route = 'partner_stay_invoice',
    status = 'executed',
    executed_at = COALESCE(i.executed_at, '2026-10-16 19:00:00+02'::timestamptz),
    auto_closed_reason = NULL,
    status_note = 'Reservering doorgegeven; gefactureerd op de verblijfsnota. Handmatig afgerond bij invoering van afhandeltypes.',
    status_updated_at = now(),
    status_updated_by = 'migratie-afhandeltypes',
    updated_at = now()
FROM public.program_requests r
WHERE i.request_id = r.id
  AND r.reference_number = 'BV-2606-0013'
  AND i.is_custom_quote = true
  AND i.block_name ILIKE '%Bravoure%'
  AND i.status NOT IN ('cancelled', 'invoiced')
  AND i.invoiced_number IS NULL;

INSERT INTO public.program_request_history (request_id, action, actor, actor_name, new_value)
SELECT r.id,
       'Onderdeel "' || i.block_name || '" omgezet naar bevestiging op verblijfsnota en afgerond (programma is geweest)',
       'system',
       'migratie-afhandeltypes',
       jsonb_build_object('item_id', i.id, 'partner_handling', 'confirm', 'billing_route', 'partner_stay_invoice', 'status', 'executed')
FROM public.program_request_items i
JOIN public.program_requests r ON r.id = i.request_id
WHERE r.reference_number = 'BV-2606-0013'
  AND i.is_custom_quote = true
  AND i.block_name ILIKE '%Bravoure%'
  AND i.status_updated_by = 'migratie-afhandeltypes';
