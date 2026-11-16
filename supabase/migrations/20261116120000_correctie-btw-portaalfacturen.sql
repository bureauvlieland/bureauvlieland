-- Correctie van drie inkoopfacturen die via het partnerportaal zijn geregistreerd
-- met een verkeerd btw-tarief (16 november 2026).
--
-- De registratiedialoog rekende het ingevoerde bedrag incl. btw terug naar
-- excl. met het tarief van het onderdeel (9%), maar stuurde dat tarief niet
-- mee. register-partner-invoice nam toen 21% en telde dat er weer bovenop.
-- Elke 9%-factuur werd zo met factor 1,21 ÷ 1,09 te hoog opgeslagen en in de
-- betaalbatch uitbetaald. De code is gelijktijdig gerepareerd
-- (supabase/functions/_shared/vatRate.ts).
--
-- Per factuur zetten we kop en allocatie terug naar het echte bedrag incl. 9%
-- btw. Daarna rekent sync_item_invoice_fields het onderdeel (invoiced_amount,
-- commission_amount) opnieuw uit. Geen van de drie onderdelen is al op een
-- commissiefactuur gezet (commission_status = pending), dus dat kan veilig.
--
-- De betaalbatches (BATCH-2610-0001 en de batch van 2026-04) blijven zoals ze
-- zijn: die zijn al uitgevoerd. Het te veel betaalde bedrag staat in de
-- omschrijving van de factuur en wordt met de partner verrekend.
--
--   T-261029  Zuiver Traiteur   pdf € 300,00 incl. 9%   betaald € 402,97   te veel € 102,97
--             (partner voerde € 363,00 in; daarbovenop de btw-fout)
--   T-261030  Zuiver Traiteur   invoer € 425,00 incl.   betaald € 471,79   te veel €  46,79
--   2026-04   Vlieland Yoga     invoer € 270,00 incl.   betaald € 299,73   te veel €  29,73
--
-- Voor T-261030 en 2026-04 is het ingevoerde bedrag teruggezet; de pdf is niet
-- opnieuw nagekeken. Wijkt de pdf af, dan corrigeer je de factuur in de admin.
--
-- protect_partner_purchase_invoice_fields weigert bedragwijzigingen zonder
-- admin- of service-context, en een migratie heeft die niet (auth.uid() is
-- null). Daarom staat die trigger tijdens deze correctie uit; de synctriggers
-- naar de onderdelen blijven gewoon aan.

ALTER TABLE public.partner_purchase_invoices DISABLE TRIGGER protect_partner_purchase_invoice_fields;

CREATE OR REPLACE FUNCTION pg_temp.correct_portal_invoice(
  _invoice_id uuid,
  _expected_incl numeric,
  _new_incl numeric,
  _note text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_excl numeric;
  v_vat numeric;
  v_item uuid;
  v_current numeric;
BEGIN
  SELECT amount_incl_vat, item_id INTO v_current, v_item
  FROM partner_purchase_invoices WHERE id = _invoice_id;

  IF v_current IS NULL THEN
    RAISE NOTICE 'Factuur % niet gevonden, overgeslagen', _invoice_id;
    RETURN;
  END IF;
  IF v_current <> _expected_incl THEN
    RAISE NOTICE 'Factuur % staat op % in plaats van %, overgeslagen', _invoice_id, v_current, _expected_incl;
    RETURN;
  END IF;

  v_excl := ROUND(_new_incl / 1.09, 2);
  v_vat := ROUND(_new_incl - v_excl, 2);

  UPDATE partner_purchase_invoices
     SET amount_excl_vat = v_excl,
         vat_rate = 9,
         vat_amount = v_vat,
         amount_incl_vat = _new_incl,
         description = COALESCE(description, '') || ' | ' || _note,
         updated_at = now()
   WHERE id = _invoice_id;

  UPDATE partner_purchase_invoice_allocations
     SET amount_excl_vat = v_excl,
         vat_rate = 9,
         vat_amount = v_vat,
         amount_incl_vat = _new_incl,
         updated_at = now()
   WHERE invoice_id = _invoice_id;

  PERFORM public.sync_item_invoice_fields(v_item);
  PERFORM public.sync_item_invoice_fields(a.item_id)
    FROM partner_purchase_invoice_allocations a
   WHERE a.invoice_id = _invoice_id AND a.item_id IS DISTINCT FROM v_item;
END;
$$;

SELECT pg_temp.correct_portal_invoice(
  '91e472eb-1c14-4ebe-83f3-e5b341d35d4f', 402.97, 300.00,
  'Correctie 16-11-2026: btw-fout portaal (was € 402,97 bij 21%), pdf is € 300,00 incl. 9%; € 102,97 te veel betaald in BATCH-2610-0001, te verrekenen'
);
SELECT pg_temp.correct_portal_invoice(
  'bb5119f2-b198-473d-8e2d-c11034eb685b', 471.79, 425.00,
  'Correctie 16-11-2026: btw-fout portaal (was € 471,79 bij 21%), ingevoerd € 425,00 incl. 9%; € 46,79 te veel betaald in BATCH-2610-0001, te verrekenen'
);
SELECT pg_temp.correct_portal_invoice(
  '4b0d1521-7072-42f8-a782-b565488d21b8', 299.73, 270.00,
  'Correctie 16-11-2026: btw-fout portaal (was € 299,73 bij 21%), ingevoerd € 270,00 incl. 9%; € 29,73 te veel betaald, te verrekenen'
);

DROP FUNCTION pg_temp.correct_portal_invoice(uuid, numeric, numeric, text);

ALTER TABLE public.partner_purchase_invoices ENABLE TRIGGER protect_partner_purchase_invoice_fields;
