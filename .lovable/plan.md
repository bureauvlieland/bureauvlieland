

## Doel
De gebruiker wil per programma-onderdeel:
1. De **definitieve factuurprijs** apart kunnen vastleggen (los van offerteprijs/quoted_price), zodat nacalculatie mogelijk is.
2. **Meerdere prijsregels per onderdeel** kunnen invoeren met **eigen BTW-tarief** (mix 9% / 21% binnen één activiteit, bv. zaalhuur 21% + diner 9%).
3. Deze regels moeten doorrollen naar de **verkoopfactuur** (AdminInvoicePreview + bureau_invoices).

## Huidige situatie (kort)
- `program_request_items` heeft één prijs (`quoted_price` óf `admin_price_override`) en één BTW-tarief (uit `building_blocks.vat_rate`).
- `AdminQuotePriceEditor` bewerkt slechts één bedrag.
- `AdminInvoicePreview` bouwt factuur op uit deze enkele prijs per item.
- Voor inkoopfacturen bestaat al `purchase_invoice_lines` — analoog patroon hergebruiken.

## Plan

### 1. Database (migratie)
Nieuwe tabel `program_item_billing_lines`:
```
id, item_id (FK program_request_items, cascade),
description text,
quantity numeric default 1,
unit_price_excl_vat numeric,
vat_rate numeric (0/9/21),
amount_excl_vat numeric,
vat_amount numeric,
amount_incl_vat numeric,
sort_order int, created_at, updated_at
```
RLS: alleen admins schrijven; klant/partner geen toegang (interne factuurregels).

Plus op `program_request_items`:
- `final_billing_locked_at timestamptz` (markeert dat de factuurregels zijn vastgesteld → tonen op factuur i.p.v. quoted_price).

### 2. Nieuwe component `AdminItemBillingLinesEditor`
Vervangt of breidt `AdminQuotePriceEditor` uit met een tabbed Popover:
- **Tab 1 — Offerteprijs** (huidig): bewerken van `admin_price_override` / `price_type` voor klant-offerte.
- **Tab 2 — Factuurregels (definitief)**: tabel met kolommen
  - Omschrijving | Aantal | Prijs excl. | BTW% | BTW€ | Incl.
  - "+ Regel toevoegen" en verwijderknop per rij
  - Mini-totalen onderaan: per BTW-tarief subtotaal + grand total
  - Bij eerste opening: één regel auto-gevuld met huidige `quoted_price` of `admin_price_override` op default BTW-tarief van het block.

Visuele indicator op item-rij: groen vinkje "Factuurregels vastgesteld" zodra ≥1 regel bestaat.

### 3. Verkoopfactuur (AdminInvoicePreview)
- **Bron-prioriteit per item:** als `program_item_billing_lines` bestaan → gebruik die regels (met eigen BTW per regel) op factuur. Anders fallback naar huidige logica (quoted_price / admin_price_override + block VAT).
- BTW-groepering aanpassen: itereert nu over billing-lines i.p.v. één regel per item.
- Categorie-groepering blijft, maar binnen item kunnen regels los staan (bv. "Brouwerij Fortuna — zaalhuur €200 21%" + "— diner €450 9%").

### 4. RegisterBureauInvoiceDialog (bureau_invoices)
- Bij openen: voorstel automatisch berekenen uit billing-lines van confirmed items (waar nog niet gefactureerd).
- Toon onderverdeling per BTW-tarief in dialoog (read-only preview), header krijgt totaal.
- Veld `vat_amount` blijft bewerkbaar voor handmatige aanpassing.
- (Out of scope nu: gekoppelde regels per bureau-invoice opslaan — kan later. We slaan nu nog steeds aggregaten op `bureau_invoices`.)

### 5. AdminRequestDetail
- Nieuwe knop/icoon naast `AdminQuotePriceEditor`: "Factuurregels" (€-icoon met regel-overlay).
- Tooltip/badge: "X regels — €Y.YY" wanneer aanwezig.

## Bestanden

**Nieuw**
- `supabase/migrations/<ts>_add_program_item_billing_lines.sql`
- `src/types/programItemBillingLine.ts`
- `src/components/admin/AdminItemBillingLinesEditor.tsx`
- `src/hooks/useItemBillingLines.ts`

**Aanpassen**
- `src/pages/admin/AdminRequestDetail.tsx` — knop integreren, query lines mee
- `src/pages/admin/AdminInvoicePreview.tsx` — render priority lines
- `src/components/admin/RegisterBureauInvoiceDialog.tsx` — auto-suggest uit lines, BTW-breakdown
- `src/integrations/supabase/types.ts` — auto-update na migratie

## Buiten scope
- Aparte invoice-lines tabel onder `bureau_invoices` (later).
- Synchronisatie van offerteprijzen → automatisch in factuurregels (blijft expliciete actie van admin).
- Klant-portaal weergave van factuurregels (alleen interne factuur-PDF).

## Open punt
De huidige `AdminQuotePriceEditor` wordt nu nog steeds gebruikt voor offerte-correcties richting klant; ik laat die intact en voeg de billing-editor ernaast toe als aparte knop. Akkoord, of wil je beide juist samenvoegen tot één popover met tabs op dezelfde pencil-knop?

