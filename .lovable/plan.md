## Probleem

De e-mails naar `bureauvlieland@boekhouding.nl` (Snelstart inbox) komen wél aan in Mailjet (status `sent` in `email_log`), maar Snelstart verwerkt ze niet. Reden: **de mail bevat alleen een HTML-overzicht en géén factuurbestand**. Snelstart's mailbox vereist een bijlage in PDF/UBL/PNG/JPG-formaat — zonder bijlage is er niets te verwerken en wordt de mail genegeerd.

Ter referentie: de mail "Factuur naar klant" (`send-bureau-invoice-to-customer`) stuurt wél een PDF mee — vandaar dat de klant kon betalen. De forward-functie naar Snelstart doet dat niet.

## Oplossing

De PDF (zoals reeds gegenereerd in `AdminInvoicePreview.tsx` via `buildPdfBlob`) als bijlage meesturen bij de doorstuur-mail naar Snelstart, op exact dezelfde manier als bij `send-bureau-invoice-to-customer`.

### Wijzigingen

1. **`ForwardBureauInvoiceDialog.tsx`** — dialoog accepteert geen `invoiceId` meer alleen, maar krijgt ook een PDF-renderer prop (`onGeneratePdf: () => Promise<Blob>`). Bij klikken op "Doorsturen":
   - Genereer PDF → converteer naar base64
   - Roep `forward-bureau-invoice` aan met `{ invoiceId, pdfBase64, pdfFilename }`

2. **`AdminInvoicePreview.tsx`** — geef de bestaande `buildPdfBlob` door aan de Forward-dialoog (al beschikbaar; nu ook doorgeven).

3. **`AdminRequestDetail.tsx`** (regel 2284 e.v.) — hier wordt de dialoog ook aangeroepen zonder PDF-context. Twee opties:
   - **Voorkeur:** vervang de directe inline-render door een redirect/link naar `AdminInvoicePreview` waar de PDF al gerenderd kan worden, of
   - **Pragmatischer:** importeer `renderInvoicePdf` + bouw daar lokaal de PDF (vereist alle factuurdata; complexer)
   - **Beste praktische keuze:** maak forward vanuit `AdminRequestDetail` alleen mogelijk via "Open factuur" → daar staat de Forward-knop met PDF-context. Verberg/disable de directe Forward-knop in `AdminRequestDetail` óf laat deze de gebruiker doorsturen naar de InvoicePreview pagina.

4. **`forward-bureau-invoice/index.ts` (edge function)** — accepteer optionele `pdfBase64` + `pdfFilename` in body, voeg ze toe aan `emailMessage.Attachments` (zelfde patroon als `send-bureau-invoice-to-customer` regel 214-218):
   ```ts
   ...(body.pdfBase64 ? { Attachments: [{
     ContentType: "application/pdf",
     Filename: body.pdfFilename || `Factuur-${invoice.invoice_number}.pdf`,
     Base64Content: body.pdfBase64,
   }]} : {})
   ```
   De PDF blijft optioneel (backwards compatible) maar in de praktijk verplicht voor Snelstart-acceptatie. Voeg een log/warning toe als er geen PDF meegegeven wordt.

5. **Onderwerp aanpassen**: kort, herkenbaar voor Snelstart, bv. `Verkoopfactuur ${invoice_number} — ${customer}` (al goed), maar mail-body mag korter — Snelstart leest toch de bijlage.

6. **Twee niet-afgeleverde berichten opnieuw versturen**: na de fix de gebruiker informeren dat hij voor factuur **FV-BV-2602-0006-001** opnieuw op "Doorsturen" moet klikken zodat Snelstart hem nu mét bijlage ontvangt.

### Optionele verbetering (later)

Genereer ook een **UBL e-factuur** (XML) als tweede bijlage. Snelstart kan UBL automatisch volledig boeken (factuurregels, BTW, debiteur). Dit is een aparte uitbreiding en valt buiten deze fix.

## Samenvatting

De forward-mail naar Snelstart bevat geen bijlage; daarom doet Snelstart er niets mee. Fix: PDF-bijlage meesturen (zelfde patroon als de klant-factuurmail). Backwards compatible op de edge function, dialoog krijgt PDF-renderer prop, AdminInvoicePreview geeft die door.