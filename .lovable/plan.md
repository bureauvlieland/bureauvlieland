## Probleem

Op `/admin/facturen` (AdminPurchaseInvoices) staan 3 inkoopfactuur-rijen die je niet hebt toegevoegd:

| Beschrijving | Bedrag | Datum |
|---|---|---|
| Overtocht Vlieland → Harlingen - RMD Trainingen | €42,96 | 1 mei 2026 |
| Groepsvervoer 8 personen - RMD Trainingen | €75,00 | 1 mei 2026 |
| Inzet 4x4 Terreinwagen - RMD Trainingen | €200,00 | 1 mei 2026 |

**Oorzaak gevonden:** alle drie zijn aangemaakt door `register-partner-invoice` met `partner_id = 'bureau'` (de sentinel-partner voor interne Bureau-items) en `invoice_number = 'nvt'`. In `program_request_history` staan ze geregistreerd als `actor: partner` — vermoedelijk via een partner-portal flow waarbij Bureau Vlieland zelf als "partner" werd behandeld voor zijn eigen managed services (ferry, transport, 4x4). Bureau hoort géén inkoopfacturen aan zichzelf te genereren.

## Wat ik wil doen

### 1. Verwijderfunctionaliteit voor inkoopfacturen
- Nieuwe `deleteInvoice` mutation in `src/hooks/usePurchaseInvoices.ts`:
  - Verwijdert ook `purchase_invoice_lines` en `partner_purchase_invoice_allocations` (cascade-cleanup)
  - Reset op het bijbehorende `program_request_items` de velden `invoiced_amount`, `invoiced_number`, `invoiced_date`, `invoiced_file_path`, `commission_*` zodat het item weer "niet gefactureerd" wordt
  - Verwijdert optioneel het PDF-bestand uit `partner-invoices` storage bucket
  - Logt actie in `program_request_history` (`action: purchase_invoice_deleted`)
- In `AdminPurchaseInvoices.tsx`: prullenbak-icoon in de "Acties" kolom + bevestigings-dialog (AlertDialog) met waarschuwing dat dit ook de commissie-status reset
- Bulk-delete optie via de bestaande checkbox-selectie (naast "Bulk doorsturen")

### 2. De 3 spook-rijen opruimen
- Eenmalige cleanup: de 3 rijen met `partner_id='bureau'` en `invoice_number='nvt'` verwijderen via een migratie of via de nieuwe delete-knop (jouw keuze — ik raad migratie aan zodat alles in één keer schoon is, inclusief het terugzetten van de item-status).

### 3. Voorkomen dat het opnieuw gebeurt
- In `supabase/functions/register-partner-invoice/index.ts` een guard toevoegen: als `partner.id === 'bureau'` → 400 fout teruggeven ("Bureau Vlieland kan geen inkoopfactuur aan zichzelf registreren"). Bureau-managed items horen via `bureau_invoices` / sales-facturen te lopen, niet via partner_purchase_invoices.

## Vraag
Wil je dat ik de 3 bestaande rijen via een **migratie** opruim (schoon + automatisch), of liever via de **nieuwe delete-knop** zodat je het zelf doet?
