# Bewerkbaar boeken als overige kosten vanuit verzamelfactuur

## Probleem
Nu boekt `bookAsExtraOnProject` in `CollectiveInvoiceSheet.tsx` de regel direct weg zodra je een project kiest — zonder kans om bedrag of omschrijving aan te passen.

## Oplossing
Hergebruik de bestaande `AdminAddCostSheet` (die al `prefill` + `onCreatedItem` ondersteunt, net zoals `AdminPostChargesSection` doet voor nacalculaties).

### Flow
1. In `BookingRow` blijft de project-picker bestaan, maar bij keuze opent een **bevestigings-sheet** (`AdminAddCostSheet`) met prefill:
   - Omschrijving: `Overtocht Rederij Doeksen — <data>`
   - Bedrag: `amount_incl_vat`
   - BTW: berekend uit `vat_amount / amount_excl_vat` (9% default)
   - Toelichting: `Verzamelfactuur Doeksen · Resnr <resnr> · <klantnaam>`
   - `providerName: "Rederij Doeksen"`
2. Gebruiker kan omschrijving, bedrag, BTW en toelichting nog wijzigen vóór opslaan.
3. Na opslaan via `onCreatedItem(newItemId)`: zet `booking_reference` op het zojuist aangemaakte item (AdminAddCostSheet slaat dat veld nu niet op) en update de booking row naar `match_status: "manual"` met `item_id`.

### Wijzigingen
- **`src/components/admin/AdminAddCostSheet.tsx`**: `prefill` uitbreiden met optionele `bookingReference?: string`; meegeven aan de insert. Geen breaking changes voor bestaande callers.
- **`src/components/admin/purchase-invoices/CollectiveInvoiceSheet.tsx`**:
  - State `extraCostTarget: { idx, project, prefill } | null` toevoegen.
  - `bookAsExtraOnProject` vervangen: opent voortaan de sheet i.p.v. direct insert.
  - `AdminAddCostSheet` renderen onderaan met `onCreatedItem` callback die `updateBooking(idx, { item_id, match_status: "manual", project })` doet en toast toont.

### Buiten scope
- Geen wijziging aan de matching-logica, finalize-flow of edge functions.
- Project kiezen gebeurt nog steeds via bestaande `ManualLinkPopover` / candidate-select; daarna opent pas de cost-sheet.
