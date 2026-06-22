## Wat is er gebeurd bij Salure (project f5a4b03d…)

**Database:** 1 factuur `FV-BV-2603-0003-001` · €13.535,49 · status `forwarded` (10-06).
**Werkelijke PDF/UBL die naar klant + Snelstart ging:** genummerd `FV-BV-2603-0003-002` met projecttotaal en regel "reeds gefactureerd -001" → "te betalen -€0,01".

**Oorzaak:** `AdminInvoicePreview` suggereert het volgnummer op basis van het aantal bestaande facturen in de DB (`priorData.length + 1`). Toen de PDF uiteindelijk werd gegenereerd, stond er al een `-001`-record in `bureau_invoices`, dus het auto-nummer schoof door naar `-002` en `-001` werd als prior afgetrokken. De DB-rij zelf heeft nog wel het juiste nummer `-001` en het juiste totaalbedrag, waardoor het admin-overzicht (zie screenshot) misleidend "Doorgestuurd · €0,00 nog te factureren" toont.

**Filename mismatch (`-001.pdf` met `-002` erin):** de download-naam komt uit `link.download = Factuur-${invoiceNumber}.pdf` op het moment van klik; vermoedelijk is er eerder al een download geweest toen het nummer nog op -001 stond. Niet kritiek, lost zichzelf op zodra we het schoonmaken.

## Plan — alleen Salure, handmatig

### Stap 1 · DB opschonen (Lovable doet dit na akkoord)
Hard verwijderen: rij `925eb2d5-1e44-444f-8073-a181e01c1e1e` (`FV-BV-2603-0003-001`) uit `bureau_invoices`. Geen `bank_line_id`-koppeling, geen betaling binnen → veilig.

### Stap 2 · Snelstart corrigeren (jij)
In Snelstart de daar geboekte `FV-BV-2603-0003-002` (€13.535,48) crediteren/verwijderen, zodat nummer `-001` straks opnieuw geboekt kan worden.

### Stap 3 · Nieuwe correcte factuur (jij, via UI)
Na het opschonen suggereert `/admin/facturatie` → preview opnieuw `FV-BV-2603-0003-001`. PDF genereren, registreren, doorsturen naar klant + Snelstart. De UBL-fix van vorige beurt zorgt nu voor de juiste BTW-split.

## Bewust niet in dit plan
- Geen wijziging aan de nummerings­logica of admin-overzicht (aparte bredere fix — pakken we los wanneer je dat wilt).
- Geen acties op Gymnasium / Tyrecenter / Oostenveld — die doen we daarna één voor één.

## Vraag
Akkoord met **stap 1** (record hard verwijderen)?
