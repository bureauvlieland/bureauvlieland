## Doel
Overal in de inkoopfactuur-weergaven bedragen tonen **inclusief BTW** (i.p.v. excl.), conform de bestaande regel "Bedragen incl. BTW" voor partner-facturatie.

## Aanpassingen

### 1. `src/hooks/usePurchaseInvoices.ts`
- `stats.totalAmount` sommeert nu over `amount_incl_vat` (fallback: `amount_excl_vat + vat_amount` als `amount_incl_vat` ontbreekt).

### 2. `src/components/admin/PurchaseInvoicesCard.tsx` (kaart op projectdetail)
- Regel `€... excl.` → `€... incl.` met `amount_incl_vat`.
- Totaal-label blijft "Totaal:" maar gebruikt nieuwe incl-som.

### 3. `src/pages/admin/AdminPurchaseInvoices.tsx` (overzichtspagina)
- KPI "totaal bedrag" → incl. BTW.
- Lijstregel bedrag → `amount_incl_vat`.
- Delete-bevestigingsdialoog bedrag → `amount_incl_vat`.

### 4. `src/pages/admin/AdminPurchaseInvoiceInbox.tsx`
- Scan-resultaat bedrag → toon `amount_incl_vat` als beschikbaar, anders excl als fallback.

## Niet wijzigen
- Database/financiële berekeningen (`adminInvoicingTotals`, billing lines) — die hebben hun eigen incl/excl-logica per context.
- Snelstart-doorsturen / e-mailtemplates — bedragen daar blijven zoals gespecificeerd door boekhouding.
- Duplicate-check melding (toont al `amount_incl_vat ?? amount_excl_vat`).

## Verificatie
- Projectdetail BV-2602-0002: Inkoopfacturen-kaart toont €2.614,50 incl. i.p.v. €2.398,62 excl.
- /admin/inkoopfacturen: KPI en lijst tonen incl-bedragen.
