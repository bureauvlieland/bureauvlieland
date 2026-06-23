# Sales Inbox

Nieuwe bron voor aanvragen: mails die binnenkomen op `sales@reply.bureauvlieland.nl` (en aliassen) verschijnen in een Sales Inbox in admin, worden via AI geparsed, en kunnen met één klik omgezet worden naar een project/aanvraag — net zoals de inkoopfacturen-inbox.

## Mailjet routing — geen extra config nodig

Mailjet Parse staat één parseroute per API-key toe (één `@parse-in1.mailjet.com`-adres), maar onze huidige route is een **catch-all op `@reply.bureauvlieland.nl`**. Alle mail naar dat subdomein komt al binnen op één webhook (`inbound-email`). Daar kunnen we onbeperkt virtuele adressen op aanmaken — de routing gebeurt server-side op het `To:`-veld. Voor de sales inbox hoeft er dus **niets bij Mailjet** te veranderen.

## Wat de gebruiker krijgt

1. Forward (of laat aanvragen rechtstreeks afleveren op) `sales@reply.bureauvlieland.nl`. Aliassen die ook werken: `leads@`, `aanvraag@`, `reply+sales@`.
2. Nieuw menu-item **Sales Inbox** onder Admin (naast Inkoopfacturen Inbox).
3. Lijst met afzender, onderwerp, ontvangstdatum, AI-status (pending/scanning/scanned/failed), en geparste klantnaam.
4. Detailsheet: ruwe mail + bijlagen + bewerkbare geparste velden (naam, e-mail, telefoon, bedrijf, aantal personen, datums, type programma, wensen, budget, bron).
5. Acties: **Maak project** (vult `program_requests` met de geparste data), **Hersannen**, **Negeer**.

## Technisch

### Database
Nieuwe tabel `sales_inbox` (admin-only RLS, service_role ALL):
- afzender (email, naam), `subject`, `body_text`, `body_html`, `received_at`
- `attachment_path/filename/size`, `raw_payload jsonb`
- `scan_status` (pending/scanning/scanned/failed), `scan_result jsonb`, `scan_error`
- `status` (new/processed/discarded), `processed_request_id` (FK `program_requests`), `processed_by`, `processed_at`, `notes`

Storage: hergebruik bestaande `email-attachments` bucket onder prefix `sales/<inbox_id>/...`.

### Edge functions
- **`inbound-email`** (uitbreiden): nieuwe `isSalesInboxRecipient(recipient)` check vóór de reference-number lookup. Match op `sales@`, `leads@`, `aanvraag@`, `reply+sales@…`. Bij match → rij in `sales_inbox` + bijlagen opslaan + async `scan-sales-lead` triggeren.
- **`scan-sales-lead`** (nieuw): leest body + tekstuele PDF-bijlagen, roept Lovable AI Gateway aan (`google/gemini-3-flash-preview` met `Output.object` schema), schrijft `scan_result` + `scan_status='scanned'`.
- **`create-request-from-sales-inbox`** (nieuw): maakt `program_requests` rij met `source='sales_inbox'`, vult klantvelden, koppelt `processed_request_id`, zet `status='processed'`, kopieert bijlagen naar `project_communications` als documenten.

### AI scan-schema (Zod)
`customer_name`, `customer_email`, `customer_phone`, `customer_company`, `number_of_people`, `preferred_dates[]`, `program_type`, `wishes`, `budget_indication`, `source`, `confidence`.

### Frontend
- Route `/admin/sales-inbox` met admin-route-guard (zelfde shell als `/admin/inkoopfacturen-inbox`).
- Componenten: `SalesInboxList`, `SalesInboxDetailSheet`, `SalesInboxScanResultForm`, `CreateRequestFromInboxDialog`.
- Sidebar: nieuw item "Sales Inbox" met unread-badge (rijen met `status='new'`).
- Bij "Maak project": navigatie naar `/admin/projecten/<nieuw id>` zodra de aanvraag is aangemaakt.

### Bevestigde defaults (geen extra vraag nodig)
- Ontvangstadres: `sales@reply.bureauvlieland.nl` (+ aliassen leads/aanvraag/reply+sales).
- PDF-bijlagen meescannen: ja, body + extracted text uit PDF-bijlagen.
- Status van het nieuwe project bij "Maak project": standaard `new_lead` (zelfde initiele state als configurator-aanvragen) zodat de bestaande admin-workflow erop aansluit.

## Uitvoervolgorde

1. Migratie `sales_inbox` (tabel + grants + RLS + policies + trigger updated_at).
2. `scan-sales-lead` edge function + Lovable AI Gateway helper.
3. `inbound-email` uitbreiden met sales-routing.
4. `create-request-from-sales-inbox` edge function.
5. Admin-route + componenten + sidebar item.
6. Sanity check: mail naar `sales@reply.bureauvlieland.nl` → verschijnt in inbox → wordt gescand → project aanmaken werkt.
