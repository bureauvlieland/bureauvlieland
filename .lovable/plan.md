# Orderregels koppelen aan inkoopfactuur

Doel: vanuit zowel het programma-item als de inkoopfactuur de orderregels (program_item_billing_lines) kunnen muteren, en per item kiezen of de werkelijke kosten of de offerteprijs leidend zijn in het Financieel Overzicht.

## 1. Database
Eén kleine migratie:
- Kolom `use_actual_costs boolean default false` op `program_request_items`.
  - `false` (default): Financieel Overzicht toont `quoted_price` (huidige gedrag).
  - `true`: toont som van `program_item_billing_lines` voor dat item.

Geen wijzigingen aan de inkoopfactuur-tabellen — die blijven leidend voor de inkoop, billing_lines blijven leidend voor de verkoop.

## 2. AdminItemBillingLinesEditor (per item, projectdetail)
Bestaande popover uitbreiden:
- Bovenaan een sectie "Gekoppelde inkoopfacturen" die alle `purchase_invoices` + `partner_purchase_invoice_allocations` toont waar `item_id` = dit item.
- Per factuur knop **"Regels overnemen"** die de invoice lines (of bij gesplitste factuur: de allocatie-regels) als concept-orderregels in de draft zet. Bestaande regels worden vervangen of aangevuld (keuze in confirm-dialog).
- Toggle "Werkelijke kosten leidend in overzicht" → schrijft `program_request_items.use_actual_costs`.
- Footer: korte vergelijking *offerteprijs* vs. *totaal regels incl.* met een waarschuwing bij > €0,50 verschil.

## 3. AddPurchaseInvoiceDialog / detail van inkoopfactuur
- Onder elke allocatie naar een item een link **"Naar factuurregels van [itemnaam]"** die de billing-lines-popover voor dat item opent (zelfde component, geprefiltered).
- Bij opslaan van een inkoopfactuur mét één enkele item-koppeling: optioneel vinkje **"Direct overnemen als factuurregels"** (alleen tonen als het item nog geen billing_lines heeft). Anders blijft het volledig handmatig — geen auto-overschrijven van bestaande regels.

## 4. Financieel Overzicht / pricing-logica
`src/lib/adminInvoicingTotals.ts` (en daarmee `invoiceTotals.ts` + customer-portal):
- `getEffectiveItemTotal(item)`:
  - heeft billing_lines én `item.use_actual_costs === true` → som van billing_lines (huidige gedrag voor admin-view).
  - heeft billing_lines maar toggle uit → val terug op `quoted_price` (centralLineTotal).
  - geen billing_lines → `quoted_price`.
- Customer-portal blijft altijd `quoted_price` tonen (indicatief), dus alleen `linesByItem`-pad in admin/factuur-context aanpassen.

## 5. Verificatie
- Sandbox-project doorlopen: item zonder regels → quoted blijft; item mét regels en toggle aan → werkelijk bedrag verschijnt; toggle uit → quoted weer terug.
- Inkoopfactuur splitsen over 2 items → bij beide items "Regels overnemen" werkt los van elkaar.
- Re-render Financieel Overzicht direct na toggle (invalidate queries voor items + invoicing).

## Technische details
- Bestanden: `program_request_items` migratie, `AdminItemBillingLinesEditor.tsx`, `AddPurchaseInvoiceDialog.tsx`, `adminInvoicingTotals.ts`, `useItemBillingLines.ts` (selectie van invoice lines), nieuw hook `usePurchaseInvoicesForItem(itemId)`.
- Geen edge-function wijzigingen nodig; alleen client-side mutaties op bestaande tabellen.
- Types regenereren na migratie.
