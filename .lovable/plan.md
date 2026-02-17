

## Plan: Database-template gebruiken voor offerte-email

### Probleem
De edge function `send-quote-offer` negeert de mooie email-template die al in de database staat. In plaats daarvan wikkelt het alle content in een hardcoded `generateQuoteEmailHtml()` functie die een extra items-tabel toevoegt. Het resultaat is dubbele content.

### Oplossing
De edge function wordt aangepast om de database-template als volledige email-HTML te gebruiken, inclusief programmadetails, CTA-knop en footer. De hardcoded `generateQuoteEmailHtml()` en `generateIntroHtml()` functies worden verwijderd.

### Wijzigingen

**1. Database: CTA-knop tekst aanpassen**

In de `email_templates` tabel wordt de CTA-knoptekst gewijzigd van "Bekijk voorstel & geef akkoord" naar **"Bekijk voorstel"**.

**2. `supabase/functions/send-quote-offer/index.ts`**

De flow wordt vereenvoudigd:

- De functies `generateIntroHtml()` en `generateQuoteEmailHtml()` (ca. 120 regels) worden verwijderd
- De `ProgramItem` interface wordt verwijderd (items-tabel niet meer nodig in email)
- Het ophalen van `program_request_items` blijft behouden (nodig voor logging metadata)
- De email-HTML wordt direct uit de database-template gehaald via `getRenderedTemplate()`
- Bij custom `emailBody` van de admin: de template variabelen worden gevuld, maar de `personal_message` variabele bevat de admin-tekst
- PDF-downloadblok wordt nog steeds ingevoegd voor `</body>` als er een PDF is

De nieuwe flow:

```text
1. Haal programma-aanvraag op
2. Bouw template-variabelen (customer_name, company_name, dates, etc.)
3. Als admin emailBody heeft ingevuld -> gebruik als personal_message
4. Render database-template met variabelen -> volledige HTML
5. Voeg eventueel PDF-link toe
6. Verstuur via Mailjet
```

### Bestanden

| Bestand | Wat |
|---------|-----|
| `email_templates` (database) | CTA-tekst "Bekijk voorstel" |
| `send-quote-offer/index.ts` | Verwijder hardcoded HTML, gebruik database-template |

