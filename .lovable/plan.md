
# Doeksen-verzamelfacturen verwerken

## Doel

Een Doeksen-verzamelfactuur in één keer kunnen controleren, kostentoekenning per project automatisch laten gebeuren, en de factuur in zijn geheel doorzetten naar Snelstart — zonder per regel handmatig allocaties te moeten typen.

## Werkwijze in het kort

1. Factuur komt binnen via Mailjet Parse → `purchase_invoice_inbox` (bestaande flow, ongewijzigd).
2. Bij "verwerken" detecteert de scan dat dit een **collectieve factuur** is (Doeksen-template met `Resnr`-kolom).
3. Per factuurregel wordt automatisch gezocht naar een match in `ticket_items` op `booking_reference`.
4. Admin krijgt een checklist: groene vinkjes voor gematchte regels, oranje voor twijfel, rood voor niet-gevonden. Bedragen incl./excl. BTW en totaal worden vergeleken met de factuur.
5. Bij goedkeuring: factuur wordt opgeslagen als `partner_purchase_invoice` zonder enkel `request_id`, met per regel een koppeling naar het bijbehorende `ticket_item` (en dus indirect het project), en doorgezet naar Snelstart-e-mail.
6. Per `ticket_item` wordt `partner_purchase_price` (en koppeling naar de inkoopfactuur) gezet → project-financiën blijven kloppen.

## Schemawijzigingen

### 1. `partner_purchase_invoices` — multi-project ondersteuning

```sql
ALTER TABLE partner_purchase_invoices
  ALTER COLUMN request_id DROP NOT NULL,
  ADD COLUMN is_collective boolean NOT NULL DEFAULT false,
  ADD COLUMN supplier_commission_excl_vat numeric DEFAULT 0,   -- commissie die leverancier aan ons geeft
  ADD COLUMN supplier_commission_vat numeric DEFAULT 0;
```

`request_id` mag NULL zijn als `is_collective = true`. Per regel komt de project-koppeling uit `ticket_items`.

### 2. Nieuwe tabel `partner_purchase_invoice_ticket_matches`

Koppelt elke factuurregel aan een (mogelijk) ticket_item.

```sql
CREATE TABLE partner_purchase_invoice_ticket_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES partner_purchase_invoices(id) ON DELETE CASCADE,
  ticket_item_id uuid REFERENCES ticket_items(id) ON DELETE SET NULL, -- NULL = geen match
  booking_reference text NOT NULL,           -- Resnr van de factuurregel
  customer_label text,                       -- "Naam" kolom uit factuur
  departure_date date,
  route text,                                -- HV / VH
  amount_excl_vat numeric NOT NULL,
  vat_amount numeric NOT NULL,
  amount_incl_vat numeric NOT NULL,
  tourist_tax numeric DEFAULT 0,
  supplier_commission numeric DEFAULT 0,     -- commissie BV ontvangt op deze regel
  match_status text NOT NULL DEFAULT 'unmatched', -- matched|ambiguous|unmatched|manual|internal
  match_confidence numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Grants + RLS (admin-only, dus geen anon grant)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON partner_purchase_invoice_ticket_matches TO authenticated;
GRANT ALL ON partner_purchase_invoice_ticket_matches TO service_role;

ALTER TABLE partner_purchase_invoice_ticket_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ticket matches"
  ON partner_purchase_invoice_ticket_matches
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
```

### 3. `ticket_items` — terugkoppeling

```sql
ALTER TABLE ticket_items
  ADD COLUMN IF NOT EXISTS purchase_invoice_id uuid REFERENCES partner_purchase_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purchase_invoice_matched_at timestamptz;
-- partner_purchase_price bestaat al
```

## Nieuwe edge function: `match-doeksen-invoice`

Input: `inbox_id`. Doet:
1. Leest het `scan_result` uit `purchase_invoice_inbox`.
2. Detecteert Doeksen-template (afzender + aanwezigheid van `Resnr`-kolom + `BTW Specificatie` met "Overtochten").
3. Parseert factuurregels in een gestructureerd JSON-array (Resnr, naam, datum, route, bedragen, TB, commissie). Combineert HV+VH-paren op zelfde Resnr.
4. Voor elke regel zoekt in `ticket_items`:
   - Primair: `booking_reference = Resnr`
   - Fallback: customer_label (fuzzy) + departure_date binnen ±1 dag
   - Speciaal: regels met naam "Bureau Vlieland" markeren als `match_status = 'internal'` (eigen kosten, geen klantproject)
5. Returnt voorgestelde matches + factuurmetadata (factuurnr, datum, totaal, BTW-breakdown). Schrijft nog niets in `partner_purchase_invoices`; dit is een dry-run voor de UI.

## Tweede edge function: `finalize-collective-invoice`

Input: `inbox_id`, bevestigde matches[]. Doet:
1. Maakt één `partner_purchase_invoices`-record aan met `is_collective = true`, `partner_id = 'doeksen'`, totaalbedragen uit de factuur, `supplier_commission_*` velden gevuld.
2. Maakt per regel een `partner_purchase_invoice_ticket_matches`-record.
3. Voor elke gematchte regel: update `ticket_items.partner_purchase_price` en `.purchase_invoice_id`.
4. Markeert `purchase_invoice_inbox.status = 'processed'`.
5. Roept bestaande `forward-purchase-invoice-to-snelstart` aan (e-mail naar Snelstart met PDF + samenvatting).

## UI: nieuwe "Verzamelfactuur"-flow in inkoopfacturen-inbox

In `src/pages/admin/AdminPurchaseInvoiceInbox.tsx` detail-view voor Doeksen-facturen:

```text
┌─ Doeksen factuur 3263242 — 31.05.2026 ──────────────────────┐
│ Totaal: € 6.290,17  ·  9 regels  ·  Commissie BV: € 277,83  │
│                                                              │
│ ✓ 12777224  Stedelijk Gymnasium    20-05  HV   €   42,96    │
│   → BV-2605-0007 Stedelijk Gymnasium       [project →]       │
│ ✓ 12777063  Artcadia / Katalys     20+22-05    €  516,60    │
│   → BV-2605-0003 Artcadia                  [project →]       │
│ ⚠ 12748222  Milou van der Zwaan    21-05  HV   €  570,60    │
│   → Mogelijke matches: 2 projecten         [kies project ▾] │
│ ✗ 12781944  Bureau Vlieland        19+22-05    € 4.119,48    │
│   → Interne kostenpost                     [intern ✓]        │
│ ...                                                          │
│                                                              │
│ Som regels:        € 6.290,17  ✓ klopt met factuurtotaal    │
│                                                              │
│ [Annuleren]  [Opslaan zonder doorsturen]  [Goedkeuren + → Snelstart] │
└──────────────────────────────────────────────────────────────┘
```

- ✓ groen = unieke match op Resnr (auto-aangevinkt)
- ⚠ oranje = meerdere kandidaten of alleen naam-match → admin kiest
- ✗ rood = geen match → admin kan handmatig project zoeken óf markeren als "intern"
- Footer toont sanity-check: som van regels vs factuurtotaal, met groene vink of waarschuwing
- "Goedkeuren + → Snelstart" is alleen actief als totalen kloppen

## Project-kant: zichtbaarheid

In project-detail (financiën-tab) krijgt elk `ticket_item` met `purchase_invoice_id` een kleine badge "📄 Inkoopfactuur Doeksen 3263242 · € 42,96", klikbaar naar de inkoopfactuur. Dat valt onder het bestaande `Financiën`-blok en hoeft geen aparte tab.

## Te wijzigen / nieuwe files

**Migratie**
- `supabase/migrations/<ts>_doeksen_collective_invoices.sql`

**Edge functions (nieuw)**
- `supabase/functions/match-doeksen-invoice/index.ts`
- `supabase/functions/finalize-collective-invoice/index.ts`

**Edge function (uitbreiden)**
- `supabase/functions/scan-purchase-invoice/index.ts` — detecteert Doeksen-template en zet `scan_result.template = 'doeksen_collective'`, parseert regelstructuur

**Frontend**
- `src/pages/admin/AdminPurchaseInvoiceInbox.tsx` — nieuwe collective-mode in detail-sheet
- `src/components/admin/purchase-invoices/CollectiveInvoiceMatcher.tsx` (nieuw) — de checklist-UI
- `src/hooks/useCollectiveInvoiceMatching.ts` (nieuw) — wrapper rond beide edge functions
- `src/types/purchaseInvoice.ts` — types voor `is_collective`, ticket_matches
- `src/pages/admin/AdminRequestDetail.tsx` — financiën-tab: badge op ticket_items met `purchase_invoice_id`

**Memory**
- Nieuwe `mem://features/doeksen-collective-invoice-flow` met de match-regels en uitzondering voor "Bureau Vlieland"-eigen regels.

## Verificatie

1. Upload deze factuur (3263242) opnieuw in de inbox → systeem detecteert Doeksen-template, toont 9 regels, matcht automatisch de Resnrs tegen bestaande `ticket_items`.
2. Sanity check footer toont € 6.290,17 = factuurtotaal.
3. Goedkeuren → in `partner_purchase_invoices` staat één record `is_collective=true`, in `partner_purchase_invoice_ticket_matches` 9 records, op gematchte `ticket_items` is `partner_purchase_price` gevuld.
4. Project-detail Stedelijk Gymnasium toont badge op het ferry-item.
5. Snelstart-mailbox ontvangt de PDF met onderwerp `Inkoopfactuur Doeksen 3263242 — € 6.290,17`.

## Scope-grens

- Geen aanpassingen aan de gewone (per-project) inkoopfactuur-flow.
- Geen automatische bankmatching-uitbreiding (loopt via bestaande `match-bank-lines`, die werkt al op `partner_purchase_invoices.amount_incl_vat`).
- Doeksen-commissie wordt vastgelegd op de factuur maar nog niet automatisch geboekt als sales — alleen als negatieve regel in de doorzet naar Snelstart.
