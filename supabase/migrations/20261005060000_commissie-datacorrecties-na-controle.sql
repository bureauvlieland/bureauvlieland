-- Commissies: datacorrecties na de controles door Erwin (5 oktober 2026),
-- docs/plan-commissiefacturen.md §2.3 #6 en #7. Beide stappen zijn gericht en
-- doen niets als de data afwijkt van wat het plan beschrijft.
--
-- Uitkomst van de derde controle (§2.3 #2, Fortuna 202600127): geen fout.
-- Het zijn twee echte facturen met hetzelfde nummer voor twee onderdelen; de
-- duplicaatwaarschuwing bij registreren is precies daarvoor bedoeld. Blijft zo.

-- 1) Hotelofferte op 21 % btw → 9 %. Logies is 9 %; het 21 %-tarief hoort bij
--    onze commissiefactuur, niet bij de kamerprijs van het hotel. Door het
--    verkeerde tarief stond de verkoopwaarde ex btw te laag en meldde de
--    werklijst een onterechte "afwijking". De commissie zelf gaat over de
--    inkoopfactuur en verandert niet; het snapshot commission_amount op de
--    offerte hangt niet aan het tarief.
--    Alleen de drie bekende, geselecteerde offertes: Zeezicht (€ 3.234 en
--    € 5.120) en Vlielandhotel (€ 775).
UPDATE accommodation_quotes q
   SET vat_rate = 9
  FROM partners p
 WHERE p.id = q.partner_id
   AND q.status = 'selected'
   AND q.vat_rate = 21
   AND (
        (p.name ILIKE '%zeezicht%' AND (abs(q.price_total - 3234) < 1 OR abs(q.price_total - 5120) < 1))
     OR (p.name ILIKE '%vlielandhotel%' AND abs(q.price_total - 775) < 1)
   );

-- 2) Onderdelen in een geannuleerd project zonder prijs en zonder
--    inkoopfactuur → geannuleerd. Een verkochte status telt als verkocht, ook
--    in een geannuleerd project (fase 1, besluit 2), dus zo'n onderdeel bleef
--    in de werklijst staan onder "Zonder grondslag". Zonder prijs en zonder
--    factuur is er niets te factureren; de status "geannuleerd" past bij het
--    project. Dit vangt ook toekomstige gevallen.
--    Nooit: onderdelen met een inkoopfactuur (via header of allocatie), met een
--    klantfactuur, met een admin-prijs, of die al commissie-gefactureerd zijn.
UPDATE program_request_items i
   SET status = 'cancelled',
       status_updated_at = now(),
       status_note = COALESCE(
         NULLIF(i.status_note, ''),
         'Automatisch geannuleerd: project geannuleerd, geen prijs en geen inkoopfactuur.'
       )
  FROM program_requests r
 WHERE r.id = i.request_id
   AND r.cancelled_at IS NOT NULL
   AND i.status IN ('confirmed', 'accepted', 'executed', 'completed')
   AND i.quoted_price IS NULL
   AND i.admin_price_override IS NULL
   AND i.actual_invoiced_excl_vat IS NULL
   AND i.invoiced_number IS NULL
   AND COALESCE(i.commission_status, 'not_applicable') NOT IN ('invoiced', 'paid')
   AND NOT EXISTS (
     SELECT 1 FROM partner_purchase_invoices pi WHERE pi.item_id = i.id
   )
   AND NOT EXISTS (
     SELECT 1 FROM partner_purchase_invoice_allocations a WHERE a.item_id = i.id
   );
