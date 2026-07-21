## Wat is er echt gebeurd

Correctie: BATCH-2607-0001 is **wél al naar ING verstuurd**, dus de dubbele betaling van €225 aan Zuiver Traiteur (factuur T-261008) is feitelijk uitgevoerd of staat ingepland bij de bank. Dat verandert het herstel: we kunnen de batch niet meer "annuleren en opnieuw genereren". We moeten:
1. De dubbele betaling terugvorderen buiten het systeem om (dat doet Erwin bij Zuiver Traiteur / via de bank).
2. In de administratie de dubbele factuur en de dubbele batch-regel correct afboeken zodat de rapportage klopt.
3. Zorgen dat dit **nooit meer kan gebeuren**.

## Herstel van deze concrete situatie (in-app)

### A. Boekhoudkundig sluitend maken
- Factuur `f07d8390-2f26-4a58-8c79-8d2494692b2f` (T-261008, 8 juni-versie) krijgt status `paid` (want ING heeft betaald) én een extra kolom `dispute_note` = *"Dubbel geregistreerd, terug te vorderen bij Zuiver Traiteur — zie originele factuur 5ffa39a1"*.
- Nieuwe status-waarde `refund_pending` toevoegen aan `partner_purchase_invoices.status` óf een aparte flag `refund_pending_at timestamptz` + `refund_reason text`. Ik kies voor een aparte flag; status blijft `paid`, refund-flag maakt het zichtbaar in de UI.
- In `AdminPaymentBatches` bij de batch-detail: rood label "1 terug te vorderen" met tooltip + link naar de factuur.
- In `AdminRequestDetail` voor het bijbehorende project: banner "Dubbele inkoopfactuur — terug te vorderen bij partner" met bedrag en link.

### B. Todo voor Erwin
Auto-todo `refund_recovery` aanmaken:
- Titel: *"Vorder €225,00 terug bij Zuiver Traiteur — dubbele T-261008 in BATCH-2607-0001"*
- Sluit-criterium: `refund_pending_at` gecleared (Erwin drukt "Terugbetaling ontvangen" op de factuur).

## Voorkomen dat dit nog eens gebeurt

### 1. Blokkeer aan de bron — DB-constraint
Migratie op `partner_purchase_invoices`:
- Generated column `invoice_number_normalized` (uppercase, zonder `[\s\-_.]`).
- Unique index op `(partner_id, invoice_number_normalized)` waar `invoice_number IS NOT NULL AND status <> 'rejected'`.
- Vóór de index: markeer `f07d8390…` als `rejected` — dat maakt de index geldig én sluit hem uit van nieuwe batches, terwijl de refund-tracking op de andere velden blijft draaien.

Hierdoor kan geen enkel codepad (admin-dialog, `register-partner-invoice`, inbox-promotie, import) hetzelfde factuurnummer twee keer voor dezelfde leverancier registreren.

### 2. Batch-generatie zelf ook laten dedupliceren (defense in depth)
In `supabase/functions/generate-payment-batch/index.ts` vóór het inserten van de batch:
- Groepeer geselecteerde facturen op `(partner_id, normalized(invoice_number))`.
- Bij >1 → 400 met melding: *"Factuur X (Partner Y) staat 2× in de selectie. Controleer of het niet per ongeluk dubbel is geregistreerd."*
- Ook waarschuwen (400) als exacte match op `(partner_id, invoice_date, amount_incl_vat)` — dat vangt getallenfouten waarbij het factuurnummer per ongeluk anders is.

### 3. UI-guard vóór de "Genereer batch"-knop
In `AdminPaymentBatches.tsx`:
- Client-side dedupe check op de aangevinkte facturen (hergebruik `normalizeInvoiceNumber`).
- Rode inline-waarschuwing per duplicaat met link naar de facturen.
- Knop `disabled` zolang duplicaten geselecteerd zijn.

### 4. Achteraf-audit
Nieuwe edge function `audit-payment-batch-duplicates` die dagelijks via `pg_cron` (of bij openen van de batch-pagina) checkt of bestaande **verzonden** batches duplicaten bevatten → maakt een `refund_recovery`-todo aan zodat Erwin het altijd ziet, ook als het via een ander pad binnenkomt.

### 5. Regressie-tests
- Vitest `paymentBatchDuplicateGuard.test.ts`: selectie met identieke, met-genormaliseerde en met-verschillende factuurnummers.
- Vitest `refundPendingWorkflow.test.ts`: refund-flag correct getoond en gesloten.
- Deno-test op `generate-payment-batch`: dedupe blokkeert dubbele selectie.

## Technische details

- **Migratie 1 (data-fix)**:
  ```sql
  ALTER TABLE partner_purchase_invoices
    ADD COLUMN refund_pending_at timestamptz,
    ADD COLUMN refund_reason text;

  UPDATE partner_purchase_invoices
     SET refund_pending_at = now(),
         refund_reason = 'Dubbele registratie T-261008 — betaald via BATCH-2607-0001, terug te vorderen bij Zuiver Traiteur',
         status = 'rejected'
   WHERE id = 'f07d8390-2f26-4a58-8c79-8d2494692b2f';
  ```

- **Migratie 2 (constraint)**:
  ```sql
  ALTER TABLE partner_purchase_invoices
    ADD COLUMN invoice_number_normalized text
    GENERATED ALWAYS AS (
      upper(regexp_replace(coalesce(invoice_number,''), '[\s\-_.]', '', 'g'))
    ) STORED;

  CREATE UNIQUE INDEX ppi_partner_invnr_unique
    ON partner_purchase_invoices (partner_id, invoice_number_normalized)
    WHERE invoice_number IS NOT NULL AND status <> 'rejected';
  ```

- **Edge function**: `normalizeInvoiceNumber` (4 regels) dupliceren in Deno; identiek aan `src/lib/purchaseInvoiceDuplicateCheck.ts`.

- **Auto-todo**: hergebruik bestaande `admin_todos` met nieuw type `refund_recovery`; sluit-criterium in `reconcile-admin-todos` = `refund_pending_at IS NULL`.

- **Types**: `PurchaseInvoice` + `PurchaseInvoiceWithRelations` uitbreiden met `refund_pending_at` en `refund_reason`; `PurchaseInvoiceStatus` ongewijzigd.

## Buiten scope
- Automatische SEPA-recall (R-transacties bij ING) — dat moet Erwin handmatig bij de bank doen als de batch nog terug te halen valt; wij faciliteren alleen de administratie.
- Aanpassing van `AdminBankStatements` matching-flow — de refund-inkomst wordt straks als gewone bank-lijn geboekt en gekoppeld aan de gemarkeerde factuur.
