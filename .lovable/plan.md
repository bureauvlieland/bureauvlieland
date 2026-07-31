## Waar het misgaat (nagerekend op Zuiver)

Er zijn **twee losse bronnen** voor "heeft dit onderdeel een inkoopfactuur":

1. `partner_purchase_invoices` (+ `partner_purchase_invoice_allocations`) — hier leest de **commissie-werklijst** uit.
2. De gedenormaliseerde velden `invoiced_number` / `invoiced_amount` / `commission_*` op `program_request_items` — hier leest het **partner-dashboard/Werkbank** (en de "Factureren"-lijst) uit.

Concreet bij Zuiver Traiteur:

| Factuur | Project | item_id op header | allocatie | `invoiced_number` op item |
|---|---|---|---|---|
| T-261015 (€ 573,39, betaald) | BV-2605-0014 Smallingerland | leeg | ja | **leeg** |
| T-261016 (€ 269,72, betaald) | BV-2604-0004 OVM | leeg | ja | **leeg** |

Daarom staan Smallingerland en OVM nog onder "Factureren — Registreer uw factuur", terwijl de factuur er allang is en zelfs betaald in batch BATCH-2607-0002.

Oorzaak: de **partner**-route (`register-partner-invoice`) schrijft de velden netjes terug naar de items (regel 270-290), maar de **admin**-route (`usePurchaseInvoices.createInvoice`, en dus ook de inkoop-inbox/e-mailmatch) doet dat níet — die schrijft alleen de header + allocaties. Alles wat jij zelf registreert, blijft dus onzichtbaar voor het partnerdashboard.

Omvang nu in de database:
- **15 items** met een gekoppelde inkoopfactuur maar zonder `invoiced_number`: trattoria-oliva 6, rederij 3, zuiver 2, bunkermuseum 2, zeehonden 1, manege-de-seeruyter 1.
- **2 items** waarbij de factuurheader direct aan het item hangt (`item_id`) en het item toch leeg is.
- **5 items** andersom: wel `invoiced_number`, geen factuurrij (oude handmatige registraties).
- Bijvangst bij Zuiver: **T-261008 staat dubbel** (twee headers, zelfde bedrag/project) — daarom zie je 'm twee keer in de facturenlijst.

## Wat ik ga bouwen

**1. Eén schrijfpunt in de database (de fix van het lek)**
Een trigger op `partner_purchase_invoices` en `partner_purchase_invoice_allocations` die de item-velden altijd synchroon houdt, ongeacht welk pad de factuur aanmaakt (partner-portal, admin, inkoop-inbox, verzamelfactuur, e-mailmatch):
- bij insert/update: zet op elk gekoppeld item `invoiced_number`, `invoiced_date`, `invoiced_amount` (allocatiebedrag ex btw), `commission_percentage` (partnerpercentage als het item er nog geen heeft), `commission_amount` en `commission_status`;
- bij verwijderen van de factuur of allocatie: maak die velden weer leeg, zodat het onderdeel terugkomt op de werklijst.

Daarmee blijft alle bestaande UI werken, maar is er nog maar één plek die deze waarheid schrijft.

**2. Backfill**
Zelfde migratie draait de sync eenmalig over alle bestaande facturen — dat repareert de 15 + 2 items in één keer (Zuiver, Trattoria Oliva, Rederij, Bunkermuseum, Zeehonden, Manege de Seeruyter). Na de backfill verdwijnen Smallingerland en OVM uit "Factureren" bij Zuiver.

**3. Consistentie-rapport in de admin**
Een klein blok op de pagina Inkoopfacturen: "Afwijkingen (n)" dat de resterende scheve gevallen toont — items met `invoiced_number` zonder factuurrij (de 5 oude handmatige) en dubbele factuurnummers per partner (T-261008). Met per regel een knop om te openen; niets wordt automatisch verwijderd, jij beslist.

**4. Tests**
- Unittest op de nieuwe sync-helper: allocatie → itemvelden, met en zonder eigen commissiepercentage, en verwijderen → velden leeg.
- Regressietest dat werklijst-status en partner-werkbankstatus voor hetzelfde item niet uiteen kunnen lopen.

**5. Run 2 — alle overige partners**
Na jouw akkoord op de fix loop ik per partner de werklijst na (Trattoria Oliva, Rederij, Bunkermuseum, Zeehonden, Manege de Seeruyter, Vlieland Outdoor Center, Fortuna, …) en rapporteer per partner: aantal gecorrigeerde regels, en of het commissietotaal verandert. Correcties aan bedragen doe ik pas na jouw bevestiging.

## Technische details

- Nieuwe migratie: functie `public.sync_item_invoice_from_purchase_invoice()` + triggers op beide tabellen, plus een backfill-`UPDATE`.
- `src/hooks/usePurchaseInvoices.ts`: de nu ontbrekende terugschrijving hoeft niet in de client — de trigger dekt het; wel invalidatie van de `partner-dashboard`/`commissie`-queries toevoegen zodat de UI direct bijwerkt.
- Nieuw: `src/components/admin/purchase-invoices/InvoiceConsistencyPanel.tsx` + query voor de afwijkingen.
- Tests onder `src/lib/__tests__/` en een Deno-test voor de triggerlogica-equivalent.
- Geen wijziging aan `get-commission-reconciliation` — die was al correct.
