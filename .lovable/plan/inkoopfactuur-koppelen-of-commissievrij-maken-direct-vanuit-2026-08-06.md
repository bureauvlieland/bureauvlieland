# Inkoopfactuur koppelen of commissievrij maken — direct vanuit de taak

De taak "Inkoopfactuur niet gekoppeld" vraagt om actie, maar er is nergens een knop om die actie uit te voeren. Op de taakpagina staan alleen "Opgepakt" en "Niet relevant", en de link "Koppel aan onderdeel of logies" in Commissie Beheer springt alleen naar een gefilterde factuurlijst waar geen koppel-actie bestaat. Dat is de dead end die je tegenkomt.

## Wat er komt

Eén nieuwe dialoog **"Factuur koppelen"** die vanaf drie plekken te openen is:

1. Taakdetail in de Werkbank (bij taken van het type inkoopfactuur niet gekoppeld) — twee knoppen: *Factuur koppelen* en *Commissievrij markeren*.
2. Rij-actie in het overzicht Inkoopfacturen (koppel-icoon), zichtbaar zolang de factuur geen onderdeel of logies-offerte heeft.
3. De bestaande link in Commissie Beheer opent nu deze dialoog in plaats van door te springen naar de factuurlijst.

In de dialoog:
- Factuurgegevens bovenaan (partner, nummer, datum, bedrag incl. btw).
- Project kiezen (voorgevuld als de factuur al een project heeft), daarna een programma-onderdeel óf een logies-offerte van dezelfde partner binnen dat project.
- Voorstel-hulp: onderdelen van dezelfde partner met een vergelijkbaar bedrag staan bovenaan met een "past bij bedrag"-hint.
- Opslaan koppelt de factuur; toast + de taak wordt automatisch gesloten.

En een tweede, kleinere dialoog **"Commissievrij markeren"** met verplichte reden (min. 3 tekens), zoals in Commissie Beheer al bestaat.

## Technische aanpak

- Nieuwe component `src/components/admin/purchase-invoices/LinkPurchaseInvoiceDialog.tsx`.
  - Programma-onderdeel: schrijft `request_id` + `item_id` op `partner_purchase_invoices` (bestaande trigger `sync_item_invoice_from_allocation` / `sync_item_invoice_fields` vult factuurnummer, bedrag en commissie op het onderdeel).
  - Logies-offerte: zet `purchase_invoice_id`, `invoiced_number` en `invoiced_date` op `accommodation_quotes` (zelfde velden als `apply-purchase-invoice-to-lodging` gebruikt) plus `request_id` op de factuur.
  - Kandidaten laden via bestaande queries op `program_request_items` (filter `provider_id` = partner) en `accommodation_quotes` (filter `partner_id`).
- Nieuwe component `src/components/admin/CommissionExemptDialog.tsx`: de reden-dialoog uit `CommissionWorklist.tsx` geëxtraheerd, roept `set-commission-exempt` aan met `type: "purchase_invoice"`. `CommissionWorklist` gaat deze component gebruiken zodat er één implementatie is.
- `src/components/admin/werkbank/OrphanTodoPanel.tsx`: `auto_entity_id` meelezen, de factuur ophalen wanneer `auto_type` = `commission_unlinked_invoice`, en de twee knoppen tonen. Na succes: taak op `done` zetten en caches `werkbank-inbox`, `commission-worklist`, `purchase-invoices` invalideren.
- `src/pages/admin/AdminPurchaseInvoices.tsx`: koppel-icoon in de acties-kolom voor facturen zonder `item_id` en zonder gekoppelde logies-offerte.
- Tests: pure helper `src/lib/purchaseInvoiceLinkTargets.ts` (kandidaten filteren + bedrag-match-score) met Vitest-dekking, zodat de matchlogica getest is zonder Supabase-mocks.
