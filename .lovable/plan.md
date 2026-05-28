## Doel

Bankafschriften (CAMT.053 XML) in het admin uploaden, regels uitlezen, en automatisch koppelen aan:
- **Verkoopfacturen** (`bureau_invoices`) → markeren als betaald bij inkomende bedragen
- **Inkoopfacturen** (`partner_purchase_invoices`, evt. via `payment_batches`) → markeren als betaald bij uitgaande bedragen

Per voorgestelde match bevestig je handmatig (auto-match + bevestigen).

---

## Nieuwe pagina

`/admin/bank-statements` — toegankelijk via Facturatie-sectie in admin sidebar.

Twee tabs:
1. **Afschriften** — lijst van geüploade CAMT-bestanden + status (verwerkt, X regels, Y gematcht, Z openstaand)
2. **Te bevestigen matches** — alle ongekoppelde of voorgestelde regels die om actie vragen (badge met aantal)

---

## Workflow

```text
Upload CAMT.053 (XML)
   │
   ▼
Edge function parst → bank_statements + bank_statement_lines
   │
   ▼
Auto-match per regel (bedrag + tegenpartij + omschrijving)
   │  • inkomend €X  → zoek bureau_invoice met invoice_number in omschrijving
   │                   en amount_incl_vat = X (±€0,01)
   │  • uitgaand €X → zoek partner_purchase_invoice met invoice_number/IBAN
   │                   óf payment_batch.batch_reference in omschrijving
   ▼
Status per regel: matched (1 voorstel) / ambiguous (>1) / unmatched / ignored
   ▼
Admin bevestigt match → factuur krijgt paid_at + linked bank_statement_line_id
```

---

## Database (nieuwe tabellen)

**`bank_statements`** — header per geüpload bestand
- `file_path`, `iban`, `statement_date`, `opening_balance`, `closing_balance`, `currency`, `uploaded_by`, `line_count`, `matched_count`

**`bank_statement_lines`** — één per transactie
- `statement_id`, `booking_date`, `value_date`, `amount` (negatief = uitgaand), `currency`
- `counterparty_name`, `counterparty_iban`, `description`, `end_to_end_id`
- `direction` ('in' | 'out'), `status` ('unmatched' | 'suggested' | 'confirmed' | 'ignored')
- `matched_invoice_type` ('sales' | 'purchase' | 'batch'), `matched_invoice_id`, `confidence` (0–1)

**Koppelingen op bestaande tabellen** (kleine kolommen, geen breaking change):
- `bureau_invoices.bank_line_id` (uuid, nullable)
- `partner_purchase_invoices.bank_line_id` (uuid, nullable)
- `payment_batches.bank_line_id` (uuid, nullable) — voor wanneer hele batch in één SEPA-betaling staat

Bij bevestigen van match: factuur krijgt `paid_at = now()` + `status = 'paid'`, regel krijgt `status = 'confirmed'`.

RLS: alleen admins (`is_admin(auth.uid())`).

---

## Storage

Nieuwe private bucket `bank-statements` voor de originele XML's (audit trail).

---

## Edge functions

1. **`parse-bank-statement`** — input: `file_path`. Parsed CAMT.053 met een lichte XML-parser, schrijft `bank_statements` + `bank_statement_lines`, roept daarna `match-bank-lines` aan.
2. **`match-bank-lines`** — input: `statement_id`. Per regel:
   - Inkomend: zoek `bureau_invoices` waar `invoice_number` in omschrijving voorkomt én bedrag matcht → `confidence` 0.95; alleen bedrag-match → 0.6 (ambiguous als >1)
   - Uitgaand: zoek `payment_batches.batch_reference` of `partner_purchase_invoices.invoice_number` in omschrijving
   - Schrijft suggesties terug naar regels

Geen secrets nodig — alles intern.

---

## UI-componenten

- **`UploadStatementDialog`** — drag-and-drop voor `.xml`, uploadt naar bucket, invoket parse-functie
- **`BankStatementsList`** — kaart per statement met IBAN, datum, saldo, badge "X van Y gematcht"
- **`BankStatementDetail`** — alle regels van één statement met inline match-actie
- **`PendingMatchesPanel`** — globaal overzicht van alle regels met status `suggested` / `unmatched` over alle statements
- **`MatchConfirmDialog`** — toont voorgestelde factuur + bedrag + omschrijving, knoppen *Bevestigen* / *Andere factuur kiezen* / *Negeren*

In **`PurchaseInvoicesCard`** en bestaande verkoopfactuur-detail: extra badge "Betaald via afschrift {datum}" wanneer `bank_line_id` is gezet.

---

## Sidebar / navigatie

In `AdminLayout` Facturatie-sectie nieuwe link **"Bankafschriften"** met badge = aantal regels met status `suggested` of `unmatched`.

---

## Scope buiten dit plan

- MT940/CSV-import (kan later, parser is geïsoleerd)
- Automatisch boekstuk naar Snelstart (kan in vervolgstap via bestaande Snelstart-flow)
- Reconciliatie-rapport / saldocontrole tegen grootboek

---

## Technische details

- CAMT.053 parsen met `fast-xml-parser` (npm: in Deno via `npm:` specifier)
- Bedrag-match tolerantie: €0,01
- `end_to_end_id` is leidend wanneer aanwezig (SEPA-referentie die wij zelf op uitgaande batches kunnen zetten in een latere iteratie)
- Bij delete van een statement: cascade naar lines, en reset `paid_at` + `bank_line_id` op gekoppelde facturen
