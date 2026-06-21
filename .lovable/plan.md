
## Wat er nu écht is gebeurd

Ik heb in de database (`bureau_invoices` + `email_log`) gekeken naar project **BV-2605-0001**:

| Factuur | Bedrag incl. BTW | Status | Verstuurd |
|---|---|---|---|
| FV-BV-2605-0001-001 | € 1.524,75 | forwarded | eerder |
| FV-BV-2605-0001-002 | € 1.932,15 | pending | 19-jun 14:09 naar `administratie@houtmolen.nl` |

Het e-maillog van -002 bevat letterlijk `amountInclVat: 1932.15` en onderwerp `Factuur FV-BV-2605-0001-002 – Bureau Vlieland`. Dat is het juiste **delta**-bedrag (projecttotaal na nacalculatie minus de al gefactureerde € 1.524,75). De klant heeft dus de correcte factuur ontvangen — wat je nu in de UI als afwijkend totaal ziet is geen wijziging in wat verstuurd is, maar een display-issue in de preview.

Maar: de **PDF zelf wordt nergens opgeslagen**. Hij wordt client-side gerenderd (`renderInvoicePdf`), als base64 doorgestuurd naar `send-bureau-invoice-to-customer`, en daarna weggegooid. Daarom kun je 'm nu niet meer downloaden, en daarom kunnen we ook niet 100% bewijzen wat er in de PDF stond (alleen het bedrag uit het log).

## Wat ik ga bouwen

### 1. Storage-bucket voor bureau-facturen
- Nieuwe private bucket `bureau-invoices` (alleen admin lezen/schrijven via service-role + signed URLs).
- Kolom `pdf_path text` op `bureau_invoices` om het storage-pad vast te leggen.

### 2. PDF archiveren bij verzenden
- In `SendBureauInvoiceToCustomerDialog`: na succesvolle send de PDF-blob ook uploaden naar `bureau-invoices/{request_id}/{invoice_number}.pdf` en `pdf_path` op de net-geregistreerde `bureau_invoices`-rij zetten.
- Idem in elke andere plek die `send-bureau-invoice-to-customer` aanroept (check `RegisterBureauInvoiceDialog` en het preview-pad).
- Pad ook loggen in `email_log.metadata.pdf_path` zodat de archiefkoppeling 1-op-1 traceerbaar is.

### 3. Download-knop in facturatieoverzicht
- In `AdminInvoicing.tsx` bij elke rij onder "Geregistreerde facturen" een knop **"Download PDF"** met `Download`-icoon.
- Bij klik: edge-function (of inline call) maakt een signed URL (geldig 5 min) voor `pdf_path` en opent die in een nieuw tabblad.
- Voor facturen zónder `pdf_path` (alle bestaande, inclusief jouw -001 en -002): knop met label **"PDF opnieuw genereren"** + tooltip "Origineel niet gearchiveerd — totalen kunnen sinds verzending zijn aangepast". Die klik render de PDF opnieuw via `renderInvoicePdf` met de huidige projectdata en archiveert 'm meteen.

### 4. Wat te doen met -002
- Voor jouw geruststelling: de mail die uitging vermeldde € 1.932,15 (exact het delta-bedrag). Ik laat dat nogmaals zien in de UI via een tooltip op de factuurregel met "verstuurd op 19-jun-2026 · € 1.932,15".
- Wil je 100% zekerheid over de PDF-inhoud: na implementatie kun je daar "PDF opnieuw genereren" klikken. Dat geeft de huidige opbouw — als de totalen exact 1.932,15 opleveren weet je dat de oorspronkelijke PDF gelijk was.

### Technische details
- Migratie: `ALTER TABLE bureau_invoices ADD COLUMN pdf_path text;` + bucket-creatie + RLS (alleen admins via `has_role`).
- Geen wijziging aan de edge function-payload — upload gebeurt in de browser ná `send`-call (service-role niet nodig, admin heeft via RLS write-access).
- Bestandsnaamconventie: `{request_id}/{invoice_number}.pdf` (zo overschrijft regenerate netjes).
- Geen breaking changes voor bestaande flows.

Wil je dat ik dit zo bouw, of wil je liever dat de PDF server-side wordt gegenereerd (sterker bewijs, maar veel grotere ingreep — `renderInvoicePdf` draait nu op `pdf-lib` in de browser)?
