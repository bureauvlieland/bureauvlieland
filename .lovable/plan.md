## Doel
Bij elke partner-inkoopfactuur is de bijbehorende commissie herleidbaar, zichtbaar en correct gekoppeld — zowel voor bestaande facturen (backfill) als voor nieuwe registraties.

## Wat er nu misgaat
- **202602844 – Diner Zeezicht (BV-2604-0004):** wél gekoppeld aan het programma-onderdeel, commissie €331,36 (pending) staat op het item, maar `supplier_commission_excl_vat` op de factuur zelf is 0.
- **202502225 – Logies Zeezicht (BV-2603-0003):** alleen op request-niveau geboekt, niet aan de `accommodation_quote` (Zeezicht, selected, commissie €644,60 pending). Daardoor ontbreekt `invoiced_amount` / `invoiced_number` op de quote en ontbreekt commissie op de factuur.

## Aanpak

### 1. Datamodel / afleiding
Per rij in `partner_purchase_invoices` één "commission link" bepalen:
- **item_id gezet** → commissie uit `program_request_items` (commission_amount, commission_status).
- **geen item_id, wel request_id + partner_id** → zoek `accommodation_quotes` (status `selected`, matchende partner + linked_program_id = request_id). Als gevonden: koppel factuur aan die quote en vul `invoiced_amount`/`invoiced_number`/`invoiced_date`/`invoiced_file_path`.
- Vul altijd `supplier_commission_excl_vat` en `supplier_commission_vat` op de factuur, afgeleid uit de gevonden commissie (of `amount_excl_vat × commission_percentage` als fallback).

### 2. Backfill (eenmalig, via insert-tool)
- Voor 202502225: koppelen aan accommodation_quote `1584d8c2…` (Zeezicht / BV-2603-0003), `invoiced_amount = 6449,88`, `invoiced_number = 202502225`, `invoiced_date`, `invoiced_file_path` uit de factuur, en `supplier_commission_*` invullen.
- Voor 202602844: `supplier_commission_excl_vat = 331,36` + bijbehorende BTW invullen (commissie blijft op het item, alleen zichtbaar op factuur).
- Alle overige oude `partner_purchase_invoices` zonder gevulde `supplier_commission_*` in één update-pass afleiden (item- óf quote-route).

### 3. Registratie-flow bij nieuwe factuur
Aanpassen in `AddPurchaseInvoiceDialog.tsx` + `MatchedRegistrationBanner.tsx` (route "orderregels boeken"):
- Bij kiezen van een programma-onderdeel: commissie op het item ophalen en `supplier_commission_*` meesturen naar de insert.
- Bij logies-facturen zonder item: dropdown/auto-suggest met de matchende `selected` accommodation_quote(s) van die partner op dat project; bij bevestigen ook `invoiced_amount`/`invoiced_number` op de quote schrijven, plus `supplier_commission_*` op de factuur.
- Herverwerken/opnieuw boeken volgt dezelfde route.

### 4. UI in Facturen-lijst (`AdminPurchaseInvoices.tsx`)
Extra kolom **"Commissie"** naast "Bedrag incl.":
- Toont `€ x,xx` uit `supplier_commission_excl_vat` (fallback: som van item/quote commission_amount).
- Badge onder het bedrag: `pending` (amber) / `invoiced` (blauw) / `paid` (groen) / `— geen commissie` (grijs, bv. bureau-interne posten).
- Klein icoontje/tooltip toont bron (item vs. logies-offerte).

### 5. Consistentie
- `partner_purchase_invoices` blijft leidend voor "wat we van de partner ontvangen"; commission_status blijft op item/quote (zoals nu). De factuurregel is puur weergave + snapshot.
- Geen wijzigingen aan `commission_invoices` / commissie-facturatie-flow zelf.

## Technische samenvatting
- Backfill: 1 SQL-update via insert-tool voor beide specifieke facturen + generieke pass op basis van item_id / (request_id + partner_id → selected quote).
- Frontend: `AdminPurchaseInvoices.tsx` (kolom + badge), `AddPurchaseInvoiceDialog.tsx` (bereken supplier_commission bij insert, quote-lookup voor logies), `MatchedRegistrationBanner.tsx` (idem bij "Orderregels boeken").
- Types in `usePurchaseInvoices.ts` uitbreiden met commissie-afgeleide velden.
- Geen schemawijziging nodig — kolommen bestaan al.

## Buiten scope
- Commissiefactuur-generatie zelf (`AdminCommissionInvoices`) blijft ongewijzigd.
- Geen aanpassing aan RLS of triggers.