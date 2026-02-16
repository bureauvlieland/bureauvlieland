

## Plan: Logiesaanvraag-status tonen op de offerte

### Probleem
Als er een logiesaanvraag gekoppeld is aan het programma, maar er nog geen offerte is binnengekomen of geselecteerd, staat er niets over logies op de offerte. De klant weet dan niet dat er al een aanvraag loopt.

### Oplossing
Een informatieblok toevoegen op de offerte-preview (PDF) dat aangeeft dat er een logiesaanvraag in behandeling is, inclusief de basisgegevens (data, aantal gasten, type accommodatie).

### Technische wijzigingen

**`src/pages/admin/AdminQuotePreview.tsx`**

1. **Extra state toevoegen** voor de accommodation request data (aankomst, vertrek, aantal gasten, type) - onafhankelijk van of er al een quote is
2. **In `fetchData()`**: bij een `linked_accommodation_id`, de accommodation request data altijd ophalen en opslaan (niet alleen wanneer er een quote is)
3. **In de PDF-sectie**: onder het programma-overzicht en boven de disclaimer, een nieuw blok tonen wanneer er wel een gekoppelde logiesaanvraag is maar geen `accommodationQuote`:
   - Koptekst "Logies" (zelfde stijl als bestaande sectie)
   - Informatieblok met amberkleurige achtergrond: "Er loopt een logiesaanvraag voor [aankomst] - [vertrek] voor [x] gasten. Wij verwachten binnenkort voorstellen van accommodatiepartners."
   - Toont het type accommodatie indien beschikbaar

Dit blok verschijnt alleen in de situatie dat er geen `accommodationQuote` is maar wel een `linked_accommodation_id` - zodra er een geselecteerde offerte is, wordt het bestaande logies-blok met prijzen getoond.

