## Doel

Voor inbox-items waar de PDF al aan een bestaande `partner_purchase_invoices`-registratie is gekoppeld (badge "PDF al gekoppeld"), moet je met één klik de gescande orderregels alsnog op het project boeken — zonder de factuur opnieuw te hoeven aanmaken.

## Wat er nu mist

- `MatchedRegistrationBanner` biedt alleen "PDF koppelen" wanneer er nog geen PDF hangt. Zit die er al, dan is er geen vervolgactie.
- De registratie bevat dan wel de PDF en het bedrag, maar:
  - geen `program_item_billing_lines` op het gekoppelde `item_id` (dus factuur/klantoverzicht mist de detailregels);
  - geen `partner_purchase_invoice_allocations` per BTW-tarief.
- De gescande `scan_result.line_items` op het inbox-item bevatten precies wat we nodig hebben.

## Aanpak

### UI

- `src/components/admin/purchase-invoices/MatchedRegistrationBanner.tsx`
  - Naast/onder de "PDF al gekoppeld"-badge een knop **"Orderregels boeken (N)"** tonen als:
    - `m.file_path` gezet is (dus al gekoppeld), en
    - `m.item_id` gezet is, en
    - het inbox-item ≥ 1 `scan_result.line_items` heeft.
  - Bij klik: bevestigings-`AlertDialog` ("Bestaande factuurregels op dit onderdeel worden overschreven"). Na bevestiging → mutatie draaien en het inbox-item naar `processed` zetten (koppelen aan bestaande `invoice_id`, zoals `markProcessed` in `usePurchaseInvoiceInbox`).

### Data-mutatie (client-side, geen nieuwe edge function)

Nieuwe helper in dezelfde component (of kleine hook `useBookScannedLinesToExistingInvoice`):

1. Map `scan_result.line_items` → rows voor `program_item_billing_lines` via bestaande `computeBillingLineAmounts` (zie `src/hooks/useItemBillingLines.ts`). VAT-rate fallback = dominant tarief uit scan, anders 21.
2. `delete` bestaande `program_item_billing_lines` voor `match.item_id`, dan `insert` nieuwe rows; zet `program_request_items.final_billing_locked_at = now()`.
3. Groepeer regels per `vat_rate` → `delete` bestaande `partner_purchase_invoice_allocations` voor `match.id`, dan `insert` één rij per BTW-tarief met `item_id = match.item_id`.
4. Log in `program_request_history` met `action: "purchase_invoice_lines_booked"` en korte samenvatting (N regels, totaal).
5. Inbox-item op `processed` zetten via bestaande `markProcessed` (koppelt aan `match.id`).

### Randgevallen

- Als het gekoppelde item een logies-quote is (via `apply-purchase-invoice-to-lodging` flow): knop verbergen wanneer `match.item_id === null` (logies-registraties koppelen aan `request_id`, niet aan een program-item). Voor die gevallen blijft de bestaande flow gelden.
- Als er al billing-lines staan: waarschuwing in de dialog met tellingen ("Er staan al X regels; deze worden vervangen").

## Uit scope

- Geen wijzigingen aan OCR/scan.
- Geen wijzigingen aan de edge functions of aan de bestaande "nieuwe factuur boeken"-flow.
- Geen support voor multi-item splitsingen bij deze shortcut — als de scan meerdere projecten raakt gebruik je nog steeds "Verwerken".
