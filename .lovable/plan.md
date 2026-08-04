# Onterechte factuur-herinnering naar partner voorkomen

## Wat er is gebeurd (nagetrokken in de data)

- Project BV-2606-0020, onderdeel "Zeehondentocht Exclusief" (uitgevoerd 26 juli).
- De inkoopfactuur **2026058** van Zeehondentochten Vlieland staat wél in het systeem (binnengekomen via e-mail, PDF aanwezig, status **betaald**), en staat ook op het onderdeel zelf (factuurnummer 2026058, € 389,91, 26 juli).
- Maar die factuur is gekoppeld op **projectniveau**, niet met een directe onderdeel-koppeling.
- De herinneringsmail van 3 augustus (verstuurd door de nachtelijke controle-taak) kijkt uitsluitend naar die directe onderdeel-koppeling. Ze zag dus "geen factuur" en stuurde de T+7-herinnering. Om dezelfde reden stond er "Bedrag: n.t.b." in de mail, terwijl het bedrag bekend is.

Op dit moment zijn er 3 onderdelen in de database die op deze manier onterecht als "factuur ontbreekt" gelden.

## Wat we aanpassen

1. **Eén waarheid voor "is er een factuur?"** — De controle-taak gaat dezelfde herkenning gebruiken als de Commissie Werklijst: een factuur telt mee als ze aan het onderdeel hangt, via een verdeelde (verzamel)factuur is toegewezen, of als het factuurnummer op het onderdeel staat. Ook onderdelen die de partner met "geen factuur" heeft afgesloten worden overgeslagen.
2. Dit geldt voor alle drie de plekken die nu los van elkaar tellen: de vriendelijke herinnering (T+3), de herinnering "factuur ontbreekt nog" (T+7) en de interne taak "factuur partner nog niet ontvangen".
3. **Bedrag in de mail** — als er nog geen indicatief bedrag bekend is, valt de mail terug op het geoffreerde bedrag in plaats van "n.t.b.".
4. **Opruimen** — de openstaande interne taken over deze al verwerkte facturen worden gesloten, zodat de Werkbank klopt.
5. Er gaat **geen automatische correctiemail** uit; als u Zeehondentochten wilt laten weten dat de herinnering onterecht was, kan dat via de gewone projectmail.

## Technisch

- Nieuwe pure helper `supabase/functions/_shared/partner-invoice-presence.ts` met `hasPartnerInvoiceSignal(item, { invoiceItemIds, allocatedItemIds, invoiceKeysByPartner })`, gebaseerd op dezelfde signalen als `_shared/commissionReconciliation.ts` (item_id, `partner_purchase_invoice_allocations`, genormaliseerd `invoiced_number` per partner, `partner_dismissed_at`).
- `check-pending-items/index.ts`: de query rond `invoicedItemIds` uitbreiden met allocaties en factuurnummers per partner; `!invoicedItemIds.has(item.id)` op de drie plekken (T+3-mail, T+7-mail, `post_execution_invoice_check`-todo) vervangen door de helper. `proforma_amount_excl_vat ?? invoiced_amount ?? quoted_price` voor `amount_excl_vat`.
- Vitest-suite `src/lib/__tests__/partnerInvoicePresence.test.ts` (import van het shared Deno-bestand, zoals bij andere shared helpers) met cases: alleen item_id, alleen allocatie, alleen invoiced_number (incl. afwijkende notatie/spaties), andere partner met zelfde nummer, dismissed, en écht ontbrekend.
- Data-opschoning: openstaande `post_execution_invoice_check` / `commission_missing_invoice` todo's op `status = done` voor onderdelen die volgens de nieuwe herkenning wél een factuur hebben.
- `check-pending-items` opnieuw uitrollen.
