## Doel

1. **Verzamelfactuur** terugzetten zoals voor de Isla-uitbreiding: alleen Doeksen, knop alleen prominent bij Doeksen-suppliers.
2. **Verwerken-dialog** uitbreiden zodat één inkoopfactuur over **meerdere projecten** verdeeld kan worden, elk met optioneel één of meer **onderdelen**.

## 1. Verzamelfactuur revert

- `supabase/functions/parse-collective-invoice/index.ts`: terug naar Doeksen-only (`extract_doeksen_invoice` prompt, Resnr-matching). `supplier_type` parameter en Isla-prompt verwijderen.
- `src/components/admin/purchase-invoices/CollectiveInvoiceSheet.tsx`: Isla-specifieke kolommen/logica/`providerId`-prop en `bookAsExtraOnProject`-Isla-prefill terug. Alleen Doeksen-kolommen tonen.
- `src/pages/admin/AdminPurchaseInvoiceInbox.tsx`: `isLikelyCollective` regex terug naar `doeksen|rederij` (geen `isla|bagage`). Knop blijft altijd zichtbaar (zoals huidige UX), maar is alleen primair amber bij Doeksen.
- Memory `mem://features/isla-vlieland-collective-invoice` verwijderen uit index.

## 2. Multi-project Verwerken-dialog

Huidige situatie: één `request_id` (project) + optioneel verdeling over `allocations` binnen dat project.

Nieuw: **"Projecten" blok** met N project-cards. Per project:
- Project-zoekselector (zoals nu)
- Bedrag (excl. BTW) — handmatig in te vullen, optellings-check tegen factuurtotaal
- Optioneel: één of meerdere onderdelen binnen dat project (zelfde allocations-UI als nu)
- Verwijder-knop

UI:
- Eerste project verplicht; "+ Project toevoegen" knop daaronder.
- Live waarschuwing als som projectbedragen ≠ factuurbedrag excl. BTW.
- Bij submit: één `partner_purchase_invoices` rij **per project** aanmaken (zelfde patroon als CollectiveInvoiceSheet), met gedeelde metadata (factuurnummer, datum, leverancier, file_path) en eigen `request_id`, `amount_excl_vat`, BTW-bedrag, allocations. BTW herberekend pro-rata op tariefniveau, of overgenomen uit allocations als die alle bedragen dekken.
- Bij één project: gedrag blijft 1-op-1 hetzelfde als nu (geen breaking change).

### Technische details

- State refactor: `requestId`/`itemId`/`allocations` → `projectSplits: Array<{ requestId, amountExcl, allocations[] }>`.
- `inboxItem` markeren als `processed` met de **eerste** aangemaakte invoice-id (zelfde patroon als CollectiveInvoiceSheet).
- Duplicate-check (`useDuplicatePurchaseInvoiceCheck`) ongewijzigd: per partner + factuurnummer.
- Bestand: `partner-invoices/{partner_id}/{first_request_id}/{...}.pdf`, gedeeld `file_path` op alle rijen.

## Risico's

- Veel state in één component; we splitsen niet (te grote refactor). We voegen alleen array-state toe naast bestaande velden.
- Bestaande callers (`defaultRequestId`) blijven werken: bij prefill wordt 1 project gevuld.
