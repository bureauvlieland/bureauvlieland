

## Plan

### 1. Drag & drop voor PDF-upload
In `AddPurchaseInvoiceDialog.tsx` (upload-stap):
- Voeg `onDragOver`, `onDragLeave`, `onDrop` handlers toe op het label
- Lokale state `isDragging` voor visuele feedback (border highlight)
- Hergebruik bestaande `handleFileChange`-logica via een gedeelde `processFile(file)` helper

### 2. AI-scan robuuster maken
Twee oorzaken die ik zie in `scan-purchase-invoice/index.ts`:

**a. Model upgraden:** `google/gemini-2.5-pro` ondersteunt PDF's via `image_url` matig. Wisselen naar `google/gemini-3-pro-image-preview` ondersteunt veel betere multi-page document interpretatie, of `openai/gpt-5` voor complexe Nederlandse facturen.

**b. Prompt versterken:** expliciet vragen om:
- Per BTW-tarief een aparte totaalregel (subtotalen)
- Orderregels met `vat_rate` per regel (nu alleen op header-niveau)
- Bij twijfel: rekenkundige check `excl + vat = incl`

**c. Schema uitbreiden:** `line_items[].vat_rate` toevoegen + `vat_breakdown` array met `{vat_rate, amount_excl, vat_amount}` zodat we meerdere BTW-tarieven herkennen.

**d. Foutmelding "AI-scan mislukt" tonen alleen als er écht een fout was** (nu false-positive bij inbox-items waarbij `file` null is maar `scanResult` toch leeg is). Conditie aanscherpen.

### 3. Meerdere orderregels met eigen BTW-tarief
**Database (migratie):** nieuwe tabel `purchase_invoice_lines`:
```
id, invoice_id (FK partner_purchase_invoices, cascade), 
description, quantity, unit_price,
amount_excl_vat, vat_rate, vat_amount, amount_incl_vat,
sort_order, created_at
```
Met RLS: alleen admins.

**UI in dialoog:** nieuwe sectie "Orderregels" tussen omschrijving en opslaan:
- Tabel met kolommen: Omschrijving | Aantal | Excl. | BTW% | BTW€ | Incl.
- Plus-knop "+ Regel toevoegen"
- Verwijder-knop per rij
- Totalen onderaan: `som excl`, per BTW-tarief het BTW-bedrag, totaal incl
- Header-velden (Excl/BTW%/BTW€/Incl) worden **berekend** uit de regels zodra er ≥1 regel is, anders blijven ze handmatig invulbaar
- Bij AI-scan worden orderregels automatisch ingevuld vanuit `line_items` (incl. vat_rate per regel)

**Save-flow:**
- Hoofdrecord blijft bestaan met aggregaten (excl/vat/incl als sommen)
- `vat_rate` op hoofdrecord = `null` (of "mixed") als verschillende tarieven; anders het enkele tarief
- Aparte insert van regels in `purchase_invoice_lines`

**Hook update:** `usePurchaseInvoices` → `createInvoice` accepteert optioneel `lines` array, doet beide inserts in één flow

### 4. Project-zoeken met type-ahead
Het bestaat al via Command, maar:
- `CommandItem.value` uitbreiden met meer zoekvelden (referentie + naam + bedrijf samengevoegd, lowercase)
- Initiële focus op `CommandInput` zodra popover opent (`autoFocus`)
- Limit verhogen of server-side zoeken: bij meer dan 500 projecten leveren we momenteel niet alles. Nu volstaat client-side maar we voegen extra trefwoorden toe (datum, status) zodat zoeken op "RMD" of een jaar werkt.
- Zelfde verbetering voor partner-zoeker (al goed maar focus toevoegen)

### Buiten scope
- Bestaand `vat_rate`-veld op `partner_purchase_invoices` blijven we vullen met het hoofdtarief (of 0 bij mixed) voor backwards compatibility met SnelStart-export
- Bewerken van orderregels na opslaan (kan later in detail-view)
- PDF-preview naast formulier

### Bestanden
- `supabase/migrations/<new>.sql` — tabel `purchase_invoice_lines` + RLS
- `src/types/purchaseInvoice.ts` — `PurchaseInvoiceLine` type
- `src/components/admin/AddPurchaseInvoiceDialog.tsx` — drag/drop, regels-UI, type-ahead focus
- `src/hooks/usePurchaseInvoices.ts` — lines meeschrijven
- `supabase/functions/scan-purchase-invoice/index.ts` — model+schema+prompt
- `supabase/functions/scan-purchase-invoice-internal/index.ts` — zelfde aanpassingen voor consistentie

