

# Plan: Logies-onderdelen tonen in offerte-preview

## Overzicht
De offerte-preview (`AdminQuotePreview.tsx`) toont momenteel alleen programma-items (activiteiten). We breiden dit uit met een logies-sectie die de gekoppelde accommodatie-offerte en bijbehorende extra's toont.

## Wat wordt getoond

Op basis van de bestaande data-koppeling (`program_requests.linked_accommodation_id` -> `accommodation_requests` -> `accommodation_quotes`):

- **Logies-sectie** (nieuw blok boven of onder programma-overzicht):
  - Accommodatienaam + partnernaam
  - Aantal nachten (berekend uit arrival/departure)
  - Prijs totaal
  - Prijs per persoon per nacht (als beschikbaar)
  - BTW-tarief (9%)

- **Logies extra's** (uit `accommodation_quote_extras`):
  - Naam + omschrijving per extra
  - Prijs per stuk, aantal, subtotaal
  - BTW-tarief

- **Totaalberekening**: logies + extras worden meegenomen in de BTW-groepen en het eindtotaal

## Welke offerte tonen?

We tonen de offerte met status `selected` of `submitted` (de actieve offerte). Pending/declined quotes worden genegeerd.

---

## Technische wijzigingen

### Bestand: `src/pages/admin/AdminQuotePreview.tsx`

1. **Nieuwe interfaces** toevoegen:
   - `AccommodationQuoteData` (accommodatienaam, prijs, BTW, partner, etc.)
   - `AccommodationExtra` (naam, prijs, aantal, BTW)

2. **Nieuwe state**:
   - `accommodationQuote` en `accommodationExtras`

3. **fetchData uitbreiden**:
   - Via `request.linked_accommodation_id` de `accommodation_requests` ophalen
   - Vervolgens de actieve quote ophalen (status = `selected` of `submitted`) met partner-naam via join
   - De bijbehorende `accommodation_quote_extras` ophalen

4. **calculateTotals uitbreiden**:
   - Logiesprijs toevoegen aan BTW-groep 9%
   - Elke extra toevoegen aan de juiste BTW-groep
   - Totaalberekening aanpassen

5. **PDF-inhoud uitbreiden**:
   - Nieuwe sectie "Logies" met tabel: accommodatienaam, nachten, prijs
   - Tabel met extra's (als aanwezig)
   - Alles boven de totaalberekening

6. **Sidebar**: aantal logies-items tonen naast activiteiten-telling

