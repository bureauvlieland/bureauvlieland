

## Klant-factuur versturen vanuit preview-pagina + Snelstart-status zichtbaar

### Wat wordt gebouwd

**A. Klant-factuur versturen** (zoals eerder besproken)

**B. Snelstart-doorstuurstatus zichtbaar maken** op zowel het Financieel Overzicht (projectdetail) als op de preview-pagina, zodat je in één oogopslag ziet of een factuur al naar `bureauvlieland@boekhouding.nl` is gestuurd.

### Wijzigingen

**1. Nieuwe edge function `send-bureau-invoice-to-customer`**
- Input: `requestId`, `pdfBase64`, `pdfFilename`, `invoiceNumber`, `invoiceDate`, `amountInclVat`, optioneel `customSubject` / `customMessage` / `recipientEmail`
- Verifieert admin-rol via JWT
- Haalt project + facturatieadres op (`billing_email` → fallback `customer_email`)
- Verstuurt via Mailjet met PDF als base64-bijlage (Mailjet `Attachments` veld; PDF <500 KB dus ruim binnen 15 MB limiet)
- ReplyTo gebruikt project-subaddressing voor dossierkoppeling
- Logt in `email_log` met type `bureau_invoice_to_customer`, `related_request_id`
- Voegt entry toe aan `program_request_history` ("Factuur {nr} verstuurd naar klant")
- Test-mode aware via `getRecipientEmail`

**2. UI op `AdminInvoicePreview.tsx`**
Naast bestaande "Download PDF" twee nieuwe knoppen:

- **"Verstuur naar klant"** → opent dialog met:
  - Ontvanger (vooringevuld bewerkbaar)
  - Onderwerp + bericht (vooringevuld bewerkbaar)
  - Checkbox "Factuur ook registreren in administratie" (default aan)
  - Bij submit: `generatePDF()` → base64 → roept edge function → bij checkbox: insert in `bureau_invoices`

**3. Snelstart-status badge**

In `FinancialOverviewCard` (projectdetail) en in de geregistreerde-facturen sectie van `AdminInvoicePreview`: per `bureau_invoices` rij een badge naast factuurnummer:

| Status | Badge | Tooltip |
|---|---|---|
| `forwarded_to_accounting_at IS NULL` | grijs "Nog niet doorgestuurd" | "Klik 'Doorsturen' om naar Snelstart te sturen" |
| `forwarded_to_accounting_at IS NOT NULL` | groen "Doorgestuurd naar Snelstart" met datum | "Doorgestuurd op {datum}" |

De bestaande "Doorsturen" knop blijft ernaast staan voor niet-doorgestuurde facturen; voor reeds doorgestuurde facturen wordt de knop een subtiele "Opnieuw doorsturen" link (voor het geval er iets mis ging).

De velden `forwarded_to_accounting_at` en `status='forwarded'` worden al gezet door de bestaande `forward-bureau-invoice` edge function — alleen de UI moet ze tonen.

**4. Klantmail-status badge (bonus, gratis meegenomen)**

Tweede badge op dezelfde rij:
- `bureau_invoice_to_customer` event in `email_log` aanwezig met status `sent` voor deze factuur → groen "Naar klant verstuurd op {datum}"
- Anders → grijs "Niet naar klant verstuurd"

Vereist alleen een extra query in de FinancialOverviewCard die `email_log` filtert op `metadata->>'invoiceId'` per factuur.

### Resultaat — workflow vanuit projectdetail

1. Klik **"Factuur Maken"** → preview-pagina
2. Vul nummer/datum aan, controleer regels
3. Klik **"Verstuur naar klant"** → dialog → Verstuur (factuur wordt geregistreerd + gemaild)
4. Terug op projectdetail zie je in Financieel Overzicht:
   - 🟢 "Naar klant verstuurd 21-04-2026"
   - ⚪ "Nog niet doorgestuurd" + knop "Doorsturen"
5. Klik **"Doorsturen"** → Snelstart-mail vertrekt
6. Badge wordt 🟢 "Doorgestuurd naar Snelstart 21-04-2026"

### Niet in scope
- Geen automatische Snelstart-doorsturing bij klantverzending (jouw expliciete keuze)
- Geen wijziging in factuur-PDF lay-out
- Geen webhook/bounce-tracking — alleen "verstuurd" status uit `email_log`

