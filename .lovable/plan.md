## Probleem
Sinds er een tweede FK bestaat tussen `partner_purchase_invoices` en `program_request_items` (de kolom `program_request_items.purchase_invoice_id` naast de bestaande `partner_purchase_invoices.item_id`), faalt de PostgREST-embed in `usePurchaseInvoices` met `PGRST201` ("more than one relationship was found"). Resultaat: de query gooit een error → `invoices` blijft leeg → zowel de pagina **/admin/inkoopfacturen** als de kaart **Inkoopfacturen Partners** in projectdetail tonen 0.

De data staat gewoon in de database (geverifieerd: 17 recente facturen aanwezig).

## Fix
In `src/hooks/usePurchaseInvoices.ts` de embed disambigueren door expliciet de FK-naam mee te geven:

```ts
program_request_items!partner_purchase_invoices_item_id_fkey(id, block_name)
```

Dat is de enige plek in de codebase waar deze ambigue embed voorkomt.

## Verificatie
- /admin/inkoopfacturen toont de bestaande facturen weer
- Projectdetail (BV-2602-0002) toont de 3 gekoppelde inkoopfacturen in de kaart
- Tellers In afwachting / Doorgestuurd / Betaald kloppen weer
