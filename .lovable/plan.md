# Plan — Project naar facturatie + pending-status overrulen

## Wat ik ga bouwen

### 1. Admin-knop "Markeer als klaar voor facturatie"

Plek: project-detailpaneel in de Werkbank (en op de bestaande `AdminRequestDetail`-header naast de andere status-acties).

Gedrag, identiek aan wat de klant-flow nu al doet in `update-customer-program`:
- Zet `program_requests.completion_status = 'ready_for_invoice'`.
- Maakt (als die nog niet bestaat) de auto-todo `invoicing_ready` aan met titel "Facturatie: {klant}".
- Logt in `program_request_history` ("admin handmatig op facturatie gezet, reden optioneel").
- Resolved openstaande `terms_reminder`-todo's (analoog).

Voorwaarden om de knop te tonen:
- `completion_status` is `in_progress` (niet al ready/partially/fully).
- Project niet `cancelled`.
- Zichtbare confirm-dialog: "Weet je zeker? Hiermee verschuift het project naar Facturatie, ook zonder dat de klant de AV heeft geaccepteerd." + optioneel reden-veld dat in de history-regel terechtkomt.

Technisch: nieuwe edge function `set-project-ready-for-invoice` (kort, service-role; doet bovenstaande 3 updates atomisch). Front-end-knop in een nieuw klein component `MarkReadyForInvoiceButton`, hergebruikt op werkbank-detail én `AdminRequestDetail`.

### 2. Pending-status van bureau-items niet meer aan klant tonen

Bureau-managed onderdelen (`provider_id = 'bureau'`: veerboot, fiets, vrije tijd) worden nooit door een externe partner bevestigd — die regelt het bureau zelf. Toch staan ze nu op `status = 'pending'` zolang er geen handmatige flip is, waardoor de klantportal "Pending" + "Wachten op aanbieders 1/6 bevestigd" laat zien en de klant blokkeert op het laatste akkoord-/AV-scherm.

Twee samenhangende fixes:

**a. Display-fix in de klantportal (geen DB-wijziging nodig):**
In `CustomerProgramItem.tsx` (regel ~145) en in `StatusSummary`/`ProgramOverviewCard` tellen we bureau-items niet meer mee als "pending". Voor bureau-items met `booking_reference` tonen we `Bevestigd` (groen). Voor bureau-items zónder booking_reference tonen we geen status-pill (intern; klant hoeft hier niet op te wachten). Hetzelfde geldt voor `statusSummary.pending` — bureau-items uitsluiten zodat de sidebar correct "Alle onderdelen bevestigd" toont.

**b. Admin-override knop "Markeer als bevestigd" per item:**
Op de admin item-rij (in `AdminRequestDetail` en in het werkbank-detail) één knop toevoegen voor items met `status = 'pending'` en `provider_id !== 'bureau'` (bv. de "Koffie & Gebak" van Rederij Doeksen) waarmee de admin de partner-status kan overrulen. Effect:
- `program_request_items.status = 'confirmed'`
- `item_quote_status = 'bevestigd'`
- Audit-log naar `program_request_history` met "admin override pending → confirmed (reden: …)".
- Geen mail naar partner (overrule is intern).
- Bestaande Send-Items-todo wordt up-to-date gezet zoals nu.

Voor bureau-items is deze knop niet nodig (de display-fix lost ze al op), maar voor netheid: bestaand "Ticket koppelen"-pad zet straks bij succesvolle koppeling het item meteen op `status='confirmed'` (kleine uitbreiding in `ticket-documents`-pad / ticket-koppel-mutator) — zodat bureau-items met booking_reference ook in de DB de juiste status hebben en niet alleen in de display.

## Technische details

- Nieuwe edge function: `supabase/functions/set-project-ready-for-invoice/index.ts` — body `{ program_id, reason? }`, service-role, drie sequential updates + history-insert.
- Nieuw component: `src/components/admin/MarkReadyForInvoiceButton.tsx` (gebruikt `AlertDialog` met reden-veld).
- Inhang-punten:
  - `src/pages/admin/AdminRequestDetail.tsx` — naast bestaande status-acties.
  - `src/components/admin/werkbank/ProjectDetailPanel.tsx` — onder de Aan zet-hint, zichtbaar als pipeline = `akkoord_ontvangen` of `av_getekend`.
- `src/components/customer-portal/CustomerProgramItem.tsx` — bureau-items renderen geen "Pending"-pill; met `booking_reference` tonen ze "Bevestigd".
- `src/components/customer-portal/StatusSummary.tsx` (+ `useCustomerPortal`/wherever `pending` count vandaan komt) — bureau-items uitsluiten uit pending-count.
- Nieuw component `OverridePendingButton` (klein) op admin-itemrij voor niet-bureau partners; roept een tweede edge function `override-item-status` aan (of een bestaande item-update-mutator als die service-role draait — checken bij implementatie).
- Ticket-koppel-flow: bij succesvolle koppeling `status='confirmed'` zetten voor bureau-items (een-regel-uitbreiding).

## Wat ik bewust niét doe

- Geen nieuwe DB-kolommen of RLS-wijzigingen — dit gebruikt allemaal bestaande velden.
- Geen wijziging aan de bestaande klant-AV-flow; die blijft de "nette" weg. De admin-knop is puur een shortcut voor uitzonderingen.
- Geen wijziging aan partner-portal, e-mailtemplates of facturatielogica zelf.

## Open vraag

Wil je de admin-override op niet-bureau partner-items (zoals "Koffie & Gebak" van Rederij Doeksen in dit project) óók nu meebouwen, of voorlopig alleen de bureau-display-fix + facturatie-knop? Voor dit specifieke project zou alleen de display-fix al genoeg zijn om de klant door te laten gaan, behalve voor die ene koffie-regel.
