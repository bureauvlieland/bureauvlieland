## Doel
Partners die wél een inkoopfactuur hebben geregistreerd maar (nog) geen PDF hebben geüpload, alsnog laten uploaden. Kernboodschap overal: **"Zonder PDF kunnen wij je factuur niet in behandeling nemen"**.

## Wat er al staat (niet aanraken)
- `UploadInvoicePdfPartnerDialog` werkt en koppelt PDF aan `partner_purchase_invoices.file_path` + `program_request_items.invoiced_file_path`.
- In `PartnerFinance` (tab "Gefactureerd") staat per regel al een badge "PDF ontbreekt" + knop "PDF toevoegen".

## Wat we toevoegen

### 1. Banner in partnerportaal (structureel)
Bovenaan `PartnerDashboard` én `PartnerFinance` een opvallende waarschuwing (rood/amber) wanneer de partner ≥1 inkoopfactuur zonder PDF heeft:

> **Actie vereist — X factu(u)r(en) zonder PDF**
> Wij kunnen je facturen niet in behandeling nemen en niet doorsturen naar onze boekhouding zolang de PDF ontbreekt. Voeg de PDF's nu toe.
> [Knop: Ga naar facturen]

Klik scrollt op `PartnerFinance` direct naar de tab "Gefactureerd" en filtert/markeert de regels zonder PDF.

### 2. Eenmalige bulk-mail (nu)
Nieuwe edge function `notify-partners-missing-invoice-pdf`:
- Groepeert `partner_purchase_invoices` waar `file_path IS NULL` per `partner_id`.
- Stuurt per partner één mail naar `partners.contact_email` met:
  - Lijst van factuurnummers + datum + bedrag + projectreferentie.
  - Boodschap: *"Wij kunnen je factu(u)r(en) niet in behandeling nemen zonder PDF-bijlage. Upload de PDF('s) via het partnerportaal."*
  - Deeplink naar `/partner/financieel?missingPdf=1`.
- Logt via `logEmail` met `metadata.template_name = 'partner_missing_pdf_reminder'`.
- Admin-trigger: knop **"Stuur reminder ontbrekende PDF's"** op `/admin/inkoopfacturen` (bovenaan), met bevestigingsdialoog die laat zien hoeveel partners en facturen geraakt worden. Eenmalig handmatig te triggeren; geen automatische bulk nu.

### 3. Automatische reminder (structureel)
Bestaande dagelijkse cron (zie `automated-reminder-system`) uitbreiden of nieuwe cron `daily-missing-pdf-reminder`:
- Voor elke `partner_purchase_invoices` met `file_path IS NULL` en `created_at < now() - 3 days`:
  - Check `email_log` of in laatste 5 dagen al een `partner_missing_pdf_reminder` is verstuurd → zo nee, stuur.
- Zelfde template als de bulkmail, maar persoonlijker (1 partner, 1+ factu(u)r(en)).

### 4. Tekstuele aanscherping in bestaande UI
- Badge "PDF ontbreekt" wordt **rood** (was amber) met tooltip: *"Niet in behandeling — voeg PDF toe."*
- Knop label blijft "PDF toevoegen", maar de regel krijgt een korte rode hint-tekst eronder.

## Technische details

**Nieuwe edge function** `supabase/functions/notify-partners-missing-invoice-pdf/index.ts`:
- Auth: admin JWT vereist voor handmatige trigger; service role voor cron.
- Body: `{ mode: 'bulk' | 'auto', partnerIds?: string[] }`.
- Query: join `partner_purchase_invoices` ↔ `partners` ↔ `program_requests` voor referentienummer.
- Mailjet via bestaande `_shared/sendMail` helper, met `logEmail({ template_name: 'partner_missing_pdf_reminder', actor: 'admin'|'system' })`.

**Nieuwe email template** `partner_missing_pdf_reminder` (informeel "je"): subject = *"Actie vereist: PDF ontbreekt bij je inkoopfactu(u)r(en)"*.

**Cron** via `pg_cron` (insert tool, geen migration): elke dag 09:00 NL → POST naar de edge function met `mode='auto'`.

**Frontend wijzigingen**:
- `src/pages/PartnerDashboard.tsx` + `src/pages/PartnerFinance.tsx`: nieuwe `MissingPdfBanner` component, query op `partner_purchase_invoices` waar `file_path is null AND partner_id = currentPartnerId`.
- `src/pages/admin/AdminPurchaseInvoices.tsx`: knop + dialoog "Stuur reminder ontbrekende PDF's".
- Kleine stijlwijziging in `PartnerFinance.tsx` (badge kleur + hint).

## Wat ik NIET doe
- Geen wijziging aan registratie-flow zelf (PDF blijft optioneel bij registreren, want soms upload later).
- Geen blokkering van `forward-purchase-invoice` (admin kan nog steeds handmatig markeren); maar de bulk-doorstuurknop slaat al automatisch facturen zonder PDF over — dat blijft zo.
