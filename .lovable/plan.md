

De gebruiker wil:
1. Inkoopfacturen kunnen mailen naar een specifiek e-mailadres (bijv. `inkoop@reply.bureauvlieland.nl` of via een nieuwe webhook).
2. De PDF-bijlage wordt automatisch geëxtraheerd en in een "inbox" gezet voor verwerking.
3. Vanuit die inbox kan de admin de factuur dan aan een project + partner koppelen (met de bestaande AI-scan flow).

De gebruiker noemt expliciet: "mailjet inkomend parse krijgen we maar niet werkend". Maar er bestaat al een werkende inbound endpoint (`inbound-email`) die binnenkomende mails verwerkt naar `*@reply.bureauvlieland.nl` op basis van reference number. Dus Mailjet Parse werkt wel — alleen niet voor random adressen. Ik moet dit even verifiëren.

Belangrijke check: `inbound-email/index.ts` werkt op basis van `reply+REF@reply.bureauvlieland.nl` patroon. Als er een mail naar bijv. `inkoop@reply.bureauvlieland.nl` komt, wordt die nu genegeerd ("no_reference"). Dus we moeten een aparte route maken.

## Plan

### 1. Database: nieuwe tabel `purchase_invoice_inbox`
Velden:
- `id`, `created_at`
- `from_email`, `from_name`, `subject`, `body_text`
- `attachment_path` (storage), `attachment_filename`, `attachment_size`
- `scan_result` (jsonb) — gescande velden van AI
- `scan_status` ('pending' | 'scanned' | 'failed')
- `status` ('new' | 'processed' | 'discarded')
- `processed_invoice_id` (FK naar `partner_purchase_invoices`, nullable)
- `processed_by`, `processed_at`

RLS: alleen admins lezen/wijzigen.

### 2. Storage: hergebruik bucket `partner-invoices` met prefix `inbox/`

### 3. Edge function aanpassen: `inbound-email`
Nieuwe route: als de recipient `inkoop@` of `facturen@` als prefix heeft (of een dedicated subdomein zoals `invoices@reply.bureauvlieland.nl`):
- Extract PDF bijlage(s) uit Mailjet payload (`Attachments` array met base64)
- Upload naar storage `partner-invoices/inbox/{timestamp}_{filename}`
- Insert in `purchase_invoice_inbox` met `scan_status: 'pending'`
- Trigger automatisch `scan-purchase-invoice` (background) zodat het bij openen al gescand is
- Maak admin todo aan: "Nieuwe inkoopfactuur in inbox van {from}"

Alternatief om Mailjet Parse-issues te omzeilen: aparte edge function `inbound-purchase-invoice` met eigen Mailjet Parse webhook URL. Schoner en minder kans op breken bestaande flow.

### 4. Nieuwe pagina: `/admin/inkoopfacturen/inbox`
- Lijst van openstaande items uit `purchase_invoice_inbox` (status='new')
- Per item: afzender, datum binnen, onderwerp, PDF preview, gescande bedragen
- Acties: "Verwerken" (opent `AddPurchaseInvoiceDialog` voorgevuld met scan + PDF) of "Negeren"
- Badge in admin sidebar met aantal openstaande items

### 5. AddPurchaseInvoiceDialog uitbreiden
- Nieuwe entry-mode: "vanuit inbox" — slaat upload-stap over en gebruikt bestaand `attachment_path` + `scan_result`
- Bij opslaan: koppelen aan inbox-item en `status` op `processed` zetten

### 6. Mailjet config (door gebruiker)
- Mailjet Parse API rule: `invoices@reply.bureauvlieland.nl` → POST naar nieuwe edge function URL
- Of subaddressing: `reply+inkoop@reply.bureauvlieland.nl` (werkt met bestaande catch-all)

### Aanbeveling: aparte edge function
Ik stel voor een **aparte function `inbound-purchase-invoice`** te maken in plaats van `inbound-email` te wijzigen. Voordelen:
- Geen risico voor bestaande project-mail flow
- Eigen Mailjet webhook URL → makkelijker te debuggen
- Aparte logging

### Buiten scope
- Direct doorsturen naar SnelStart vanuit de inbox (kan als vervolgstap)
- Multi-attachment per mail (focus op 1 PDF per mail; meerdere → meerdere inbox-items)
- Forwarded mail parsing (waar de echte factuur in een quoted body zit)

