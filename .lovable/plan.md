## Wat er aan de hand is (geverifieerd in de database)

Er zijn precies **3** inkoopfacturen met het label "via e-mail":

| Factuur | Partner | Project | Bedrag incl. | Status in DB | PDF aanwezig |
|---|---|---|---|---|---|
| 202610041 (11 jul 2026) | Vliehors Expres | BV-2604-0004 | € 749,99 | `pending_email_match` | ja |
| 202610040 (11 jul 2026) | Vliehors Expres | BV-2606-0022 | € 420,00 | `pending_email_match` | ja |
| 2026045 (22 jun 2026) | Zeehondentochten Vlieland | BV-2604-0004 | € 360,01 | `pending_email_match` | ja |

Alle drie zijn: **niet doorgestuurd naar de boekhouding, niet in een betaalbatch, niet betaald.** Ze staan dus al weken stil.

## Waarom ze blijven hangen

Als een partner in het portaal aangeeft "ik heb de factuur per e-mail gestuurd", zet `register-partner-invoice` de status op `pending_email_match` (in plaats van `pending`). Die status is bedoeld als tijdelijke wachtstand tot de PDF uit de inkoop-inbox eraan gekoppeld is. Maar:

1. **Niets zet die status ooit terug.** In de hele codebase komt `pending_email_match` maar op één plek voor: bij het aanmaken. Het koppelen van de PDF vanuit de inbox (`MatchedRegistrationBanner`) schrijft alleen `file_path`, `invoice_number` en `invoice_date` — niet de status. Bij alle drie de facturen is de PDF inmiddels wél gekoppeld, maar de status bleef staan.
2. **Daardoor vallen ze overal buiten de boot:**
   - Bulk "doorsturen naar boekhouding" pakt alleen `pending` en `forwarded`.
   - Betaalbatches selecteren alleen `status = 'forwarded'` → deze facturen kunnen niet betaald worden.
   - De statuskolom toont niets (de badge-functie heeft geen case voor `pending_email_match`) — precies wat op de screenshot te zien is: een lege statuscel.
   - Het statusfilter en de KPI-tegels (In afwachting / Doorgestuurd / Betaald) tellen ze niet mee, dus ze zijn ook nergens als achterstand zichtbaar.

Kortom: het zijn echte, openstaande crediteuren van in totaal **€ 1.530,00** die onzichtbaar uit de betaalstroom zijn gevallen.

## Plan

1. **Statusovergang bij PDF-koppeling.** In `MatchedRegistrationBanner` (en de handmatige "PDF toevoegen"-actie in `AdminPurchaseInvoices`) de status meepatchen naar `pending` zodra er een `file_path` wordt gezet en de status nog `pending_email_match` is.
2. **Vangnet in de database.** Trigger op `partner_purchase_invoices`: zodra `file_path` van leeg naar gevuld gaat en de status `pending_email_match` is, automatisch naar `pending`. Zo kan dit ook niet via een ander pad meer stilvallen.
3. **Zichtbaar maken in plaats van verstoppen.** In `AdminPurchaseInvoices`:
   - Badge-case voor `pending_email_match` ("Wacht op PDF", amber/oranje) zodat de statuscel nooit leeg is.
   - Filteroptie "Wacht op PDF" toevoegen.
   - KPI-tegel "In afwachting" laten meetellen, of een aparte teller "Wacht op PDF" met waarschuwingskleur bij ouderdom > 14 dagen.
   - Bulk-doorsturen: `pending_email_match`-regels mét PDF meenemen; zonder PDF blokkeren met een duidelijke melding.
4. **De 3 bestaande facturen rechttrekken.** Data-update: deze drie (PDF is al gekoppeld) naar status `pending`, zodat ze normaal doorgestuurd en in de eerstvolgende betaalbatch meegenomen kunnen worden.
5. **Tests.** Unit-tests op de statusovergangsregel (PDF erbij → `pending`; geen PDF → blijft wachten) en op de batch-/doorstuur-selectie, zodat een factuur met PDF nooit meer buiten de betaalstroom kan vallen.

### Technische details
- Betrokken: `supabase/functions/register-partner-invoice/index.ts` (alleen ter referentie, gedrag blijft), `src/components/admin/purchase-invoices/MatchedRegistrationBanner.tsx`, `src/pages/admin/AdminPurchaseInvoices.tsx`, `src/lib/paymentBatchGuards.ts`, nieuwe migratie voor de trigger, plus een data-update voor de 3 bestaande rijen.
- De statuscheck-constraint (`pending`, `pending_email_match`, `forwarded`, `paid`) blijft ongewijzigd.
