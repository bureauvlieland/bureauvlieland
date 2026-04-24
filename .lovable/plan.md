

# Plan: Commissiefactuur (PDF + Snelstart) vanuit Commissies-overzicht

## Antwoorden op je vragen eerst

**1. Waarom verschijnen LOG-2603-0005 / BV-2603-0017 niet bij Verwacht?**
Omdat Zeezicht de partnerfactuur (`202501317`, € 1.086) inmiddels heeft geregistreerd. De tab **"Verwacht"** toont alleen items waar `invoiced_number IS NULL` (= partner heeft nog geen factuur ingediend). Zodra die factuur is verwerkt, springt het item automatisch door naar **"Te factureren"** met `commission_status = 'pending'` en commissie € 108,60. Daar staat het nu klaar voor jou.

**2. Wanneer schuift een onderdeel naar "Te factureren"?**
Ja — exact zoals jij het samenvat. Het mechanisme is:
- **Activiteiten**: zodra een admin (of partner via portaal/edge function `register-partner-invoice`) een partnerfactuur op een `program_request_item` registreert → `invoiced_number` + `invoiced_amount` worden gezet, `commission_amount` = excl. BTW × commissie%, `commission_status = 'pending'`.
- **Logies**: bij `register-accommodation-invoice` op een `accommodation_quote` exact dezelfde mutatie.
- Vóór die partnerfactuur staat het item in **Verwacht** (pro-forma berekening op basis van `quoted_price`/`price_total`).

## Feature: hint op "Verwacht" + commissiefacturen genereren

### A. Subtiele hint in Verwacht-tab
Per partner-groep in `AdminCommissions.tsx` (Verwacht-view) een extra regel onder de partnernaam:
> *"Let op: 3 commissies van Zeezicht (€ 752,00) staan klaar onder 'Te factureren'."*

Implementatie: een lichte query in `get-admin-commissions` (Verwacht-pad) die per partner uit de gefilterde set ook `pending`-totalen meelevert (`pendingCount`, `pendingTotal`). Klikbaar → springt naar `statusFilter='pending'` met dezelfde partner-filter actief.

### B. Commissiefactuur genereren (PDF + verzenden + Snelstart)
Volledig parallel aan de bestaande klantfacturen-flow (`AdminInvoicePreview` + `renderInvoicePdf` + `forward-bureau-invoice`). Reikwijdte:

#### 1. Nieuwe tabel `commission_invoices`
- `id`, `invoice_number` (uniek), `invoice_date`, `due_date`, `partner_id`, `recipient_name/email/address` (snapshot), `amount_excl_vat`, `vat_rate` (21%), `vat_amount`, `amount_incl_vat`, `status` (`draft` | `sent` | `forwarded` | `paid`), `forwarded_to_accounting_at`, `forwarded_by`, `pdf_path` (bucket `commission-invoices`), `created_by`, `created_at`, `updated_at`.
- Koppeltabel `commission_invoice_lines` (`invoice_id`, `item_id` of `quote_id`, `item_type`, snapshot van `block_name`, `customer_label`, `event_date`, `invoiced_amount`, `commission_percentage`, `commission_amount`).
- RLS: alleen admins (zelfde patroon als `bureau_invoices`).
- Storage bucket `commission-invoices` (private, alleen admins).

#### 2. Nummering
Aparte reeks `BVC-{YYMM}-{0001}` via een trigger (analoog aan `generate_program_reference_number`). Apart van klantfacturen om verwarring te voorkomen.

#### 3. Nieuwe pagina `/admin/commissies/factuur-maken`
Bereikt via een nieuwe knop **"Commissiefactuur maken"** in de Te-factureren-tab (verschijnt bij ≥1 selectie binnen één partner — itemcheck, verschillende partners worden geweigerd met toast).

Layout analoog aan `AdminInvoicePreview`:
- Linkerkolom: bewerkbare regels per geselecteerd item (omschrijving "Commissie [activiteitnaam] – [klant] – [datum]", grondslag = `invoiced_amount` excl. BTW, %, subtotaal). Regels mogen worden aangepast.
- Rechterkolom: factuurnummer (auto-gegenereerd, override mogelijk), factuurdatum, vervaltermijn (default 14 dagen), notitietekst.
- Onder: BTW-overzicht (commissie altijd 21%), totaal incl. BTW.
- Knoppen: **Download PDF** en **Verstuur naar partner**.

#### 4. PDF-rendering
Hergebruik `renderInvoicePdf` uit `src/lib/invoicePdfRenderer.ts` met:
- `customer` = partnergegevens (naam, adres, KvK uit `partners`-tabel).
- `categories` = één categorie "Commissie" met de geselecteerde regels.
- `meta.deliveryDate` = "Periode {oudste – jongste eventdatum}".
- `notes` = standaardtekst "Commissie conform partneraanbod, voldoening binnen {paymentTermDays} dagen op {iban}.".

#### 5. Verzenden naar partner
Nieuwe edge function `send-commission-invoice-to-partner` (kopie van `send-bureau-invoice-to-customer`):
- Input: `commissionInvoiceId`, `pdfBase64`, `recipientEmail` (default `partners.contact_email ?? partners.email`), custom subject/message.
- Verstuurt via Mailjet, slaat PDF op in `commission-invoices/{partner_id}/{invoice_number}.pdf`, schrijft `email_log`-regel (`email_type: 'commission_invoice_sent'`).
- Werkt status `commission_invoices.status = 'sent'` bij + zet op alle gekoppelde `program_request_items` / `accommodation_quotes` `commission_status = 'invoiced'` en `commission_invoiced_at = now()` (vervangt de huidige handmatige "Markeer als gefactureerd"-flow voor deze items).

#### 6. Doorsturen naar Snelstart
Nieuwe edge function `forward-commission-invoice` (kopie van `forward-bureau-invoice`):
- Verstuurt PDF + factuurinfo naar `snelstart_email` (uit `app_settings`).
- Knop "Doorsturen naar Snelstart" verschijnt op een nieuwe **`/admin/commissies/facturen`** lijst-pagina (alle uitgegane commissiefacturen, status-badges, doorstuur- en betaal-acties), ontworpen identiek aan `AdminPurchaseInvoices`.
- Na doorsturen → `status = 'forwarded'`, `forwarded_to_accounting_at = now()`.

#### 7. Markeren als betaald
Op de nieuwe `/admin/commissies/facturen` pagina: knop "Markeer als betaald" → werkt zowel `commission_invoices.status = 'paid'` als alle gekoppelde items op `commission_status = 'paid'` (vervangt de huidige losse "Markeer als betaald"-knop in de Gefactureerd-tab voor items die via een commissiefactuur zijn gegaan).

### C. UI-aanpassingen `AdminCommissions.tsx`
- Verwacht-view: extra regel met klikbare hint per partner.
- Te factureren-view: knop "Markeer als gefactureerd" wordt vervangen door **"Commissiefactuur maken"** (de oude flow blijft bereikbaar achter een "Snel markeren zonder PDF"-menu-item voor uitzonderingen, zodat historische data nog handmatig gezet kan worden).
- Nieuwe sub-navigatie `Commissies → Facturen` voor het overzicht uit B.7.

## Niet in scope
- Geen wijzigingen aan partnerportaal (partner ziet `commission_status` zoals nu).
- Geen pro-forma "credit op commissie" (komt later als nodig).
- Geen automatische koppeling met betalingsherkenning vanuit bankexport.

## Bestanden (verwacht)
- **DB-migratie**: `commission_invoices` + `commission_invoice_lines` + sequentie-trigger + RLS + storage bucket.
- **Nieuw**: `src/pages/admin/AdminCommissionInvoiceCreate.tsx`, `src/pages/admin/AdminCommissionInvoices.tsx`, `src/components/admin/SendCommissionInvoiceDialog.tsx`, `src/components/admin/ForwardCommissionInvoiceDialog.tsx`.
- **Nieuwe edge functions**: `send-commission-invoice-to-partner`, `forward-commission-invoice`.
- **Aanpassingen**: `src/pages/admin/AdminCommissions.tsx` (hint + nieuwe knop), `supabase/functions/get-admin-commissions/index.ts` (pendingTotal per partner in Verwacht-pad), `src/App.tsx` (nieuwe routes).
