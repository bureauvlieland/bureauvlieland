## Wat is er gebeurd bij factuur 202702

**Feit vanuit de data:**
- Onze DB, SEPA-XML en batch-totaal bevatten allemaal €595,90 voor deze inkoopfactuur.
- Berekening: 11 × €49,70 = €546,70 → +9% BTW = €595,90 incl.

**Feit vanuit jouw uitleg van de PDF:**
- "11 ritten à €49,70 p.p. **incl.** 9% BTW" — de eenheidsprijs op de PDF is **al inclusief** BTW.
- Correcte totaal = 11 × €49,70 = **€546,70 incl**, waarvan excl = €501,56 en 9% BTW = €45,14.

**Overpayment: €49,20** (het verschil tussen onze berekening en het werkelijke PDF-totaal).

**Oorzaak (onbevestigd, moet stap 1 zijn):** de PDF-scanner (`parse-partner-invoice`) heeft €49,70 geclassificeerd als **excl.**-tarief en er 9% BTW bovenop gerekend, terwijl het tarief incl. was. In `AddPurchaseInvoiceDialog` is dat vervolgens ongewijzigd doorgezet naar `amount_incl_vat`. Er is nu geen enkele check die het door ons berekende totaal vergelijkt met het feitelijk op de PDF gedrukte totaalbedrag.

---

## Plan

### Stap 1 — Bevestig oorzaak (blokkerend)
- Download de originele PDF en verifieer visueel: (a) de "Totaal te betalen"-regel, (b) of €49,70 daadwerkelijk incl. of excl. staat vermeld.
- Sla de bevindingen op als notitie op de invoice. Alleen bij bevestiging doorgaan met de volgende stappen.

### Stap 2 — Detectie-sweep over alle inkoopfacturen
Bouw een read-only rapport dat voor elke `partner_purchase_invoices`-rij het PDF-totaal opnieuw parseert en vergelijkt met `amount_incl_vat`:
1. Nieuwe edge function `reconcile-purchase-invoice-totals` die alle invoices met een `file_path` afloopt, de PDF-tekst extraheert (`pdftotext`/pdfjs), en een lijst met "totaal-kandidaten" haalt (`Totaal`, `Te betalen`, `Totaalbedrag`, `Grand total`).
2. Vergelijking:
   - **Match binnen €0,02** → OK.
   - **Afwijking** → schrijf naar nieuwe tabel `purchase_invoice_reconciliation_findings` (invoice_id, stored_incl, pdf_incl_candidates, difference, severity, batch_id, status).
3. Admin-scherm `/admin/facturen/afwijkingen` dat de findings toont, met per rij:
   - Vlag als "in batch verzonden" of "nog niet verzonden".
   - Actieknop "Markeer als terug te vorderen" (zet `refund_pending_at` + `refund_reason`).
   - Actieknop "Corrigeer bedrag" (opent AddPurchaseInvoiceDialog in edit-mode — vereist eerst dat batch/forwarded-status wordt onderzocht).
4. Reken bij factuur 202702 alvast handmatig af: markeer `refund_pending_at` met reden "BTW-interpretatiefout: PDF-tarief was incl., ons systeem berekende excl.+9% → €49,20 teruggevorderd".

### Stap 3 — Structurele guard in de invoerflow (voorkomen)
**In `parse-partner-invoice`:**
- Naast line-items ook altijd een `pdf_total_incl_vat_candidates: number[]` teruggeven (regels waar `totaal|te betalen|grand total|totaalbedrag` in staat, met bijbehorend bedrag).
- Zet daarnaast een `pdf_total_incl_vat: number | null` (de meest waarschijnlijke totaalregel, of `null` bij twijfel).

**In `AddPurchaseInvoiceDialog`:**
- Boven de "Opslaan"-knop een verplichte vergelijkingscomponent tonen:
  ```
  PDF-totaal (uit factuur):   € 546,70
  Onze berekening (som rijen): € 595,90
  Verschil:                    € 49,20  ⚠️
  ```
- Bij verschil > €0,02: knop "Opslaan" disabled. Twee opties:
  1. **Corrigeer regels** (BTW-modus toggle: "Eenheidsprijs is incl. BTW" → herbereken excl door /1,09).
  2. **Forceer opslaan** — vereist reden in vrij tekstveld (opgeslagen in nieuwe kolom `amount_mismatch_reason`).
- Wanneer PDF-totaal niet betrouwbaar geëxtraheerd kon worden (`pdf_total_incl_vat === null`), toon een gele banner "Kon totaal niet automatisch verifiëren — controleer handmatig" en verplicht handmatige bevestiging via checkbox.

**Toggle "incl./excl. BTW" per regel:**
- Elke line-row krijgt een radio-groep `Eenheidsprijs is: [ ] excl. BTW  [x] incl. BTW`.
- Standaard: incl. BTW (past bij hoe NL-horeca/dagrecreatie meestal factureert). Bij "incl." wordt excl herrekend als `unit / (1 + rate/100)`.
- Scanner-output krijgt een veld `unit_price_is_inclusive: boolean` en zet de radio automatisch — bij Manege De Seeruyter, isla-vlieland, etc. is dit meestal true.

### Stap 4 — Extra guard in `generate-payment-batch`
Voeg voor elke geselecteerde invoice deze checks toe:
- Weiger als `amount_mismatch_reason IS NOT NULL AND refund_pending_at IS NULL` (mismatch niet opgelost).
- Weiger als er een openstaande finding in `purchase_invoice_reconciliation_findings` bestaat met status `open`.
- Foutmelding lijst per invoice welke check faalde.

### Stap 5 — Contract-tests
- `purchaseInvoiceInclExclGuard.test.ts`: test `computeLineTotals` met incl-toggle voor beide modi + fixtures 11×€49,70@9%.
- `purchaseInvoiceMismatchGuard.test.ts`: test dat "Opslaan" alleen doorkomt bij match of expliciete reden.
- `generatePaymentBatchMismatchGuard.test.ts`: test dat een invoice met unresolved mismatch niet in de batch komt.
- `reconcilePurchaseInvoiceTotals.test.ts`: unit-test voor de PDF-totaal-parser met 5 varianten (Nederlands "Totaal", "Te betalen", "Totaalbedrag incl. BTW", Engelse "Grand total", en een PDF zonder totaalregel).

### Stap 6 — Terugvordering-workflow (afronding)
- Op de refund-vlag komt een aparte lijst in `/admin/betaalbatches` sectie "Terug te vorderen bedragen" met per regel: partner, factuur, verschil, reden, datum toegevoegd, contactknop.
- Zodra terugbetaling binnen is: knop "Terugbetaling ontvangen" clear `refund_pending_at` en logt in `project_communications`.

---

## Technische details

**Nieuwe DB-kolommen (`partner_purchase_invoices`):**
- `amount_mismatch_reason TEXT` — reden van geforceerde afwijking bij invoer.
- `pdf_total_incl_vat NUMERIC(10,2)` — cache van geparseerd PDF-totaal voor later verificatie.
- `unit_price_is_inclusive BOOLEAN DEFAULT FALSE` (optioneel, per line via `purchase_invoice_lines`).

**Nieuwe tabel `purchase_invoice_reconciliation_findings`:**
```
id, invoice_id (FK), stored_incl, pdf_incl_extracted, difference, severity,
in_batch_id (nullable), status ('open'|'resolved'|'ignored'),
resolved_by, resolved_at, resolution_note, created_at, updated_at
```
- RLS: admin-only (has_role admin).
- GRANT SELECT/INSERT/UPDATE aan authenticated + service_role.

**Bestanden die aangepast worden:**
- `supabase/functions/parse-partner-invoice/index.ts` — extra totaal-extractie.
- `supabase/functions/generate-payment-batch/index.ts` — mismatch-guard.
- `supabase/functions/reconcile-purchase-invoice-totals/index.ts` — nieuw.
- `src/components/admin/AddPurchaseInvoiceDialog.tsx` — vergelijkingsblok, incl/excl toggle, forceer-reden.
- `src/pages/admin/AdminPurchaseInvoiceFindings.tsx` — nieuw scherm.
- `src/lib/purchaseInvoiceTotalMatch.ts` — helpers + tests.

**Migraties:** twee migraties (kolommen + nieuwe tabel), beide met verplichte GRANTs en RLS.

**Data-fix voor 202702:** één `UPDATE` via insert-tool nadat oorzaak in stap 1 is bevestigd.

Wil je dat ik dit zo bouw?