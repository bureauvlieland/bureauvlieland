

# Plan: Logies-onderdelen toevoegen aan factuur-preview

## Overzicht
De factuur-preview (`AdminInvoicePreview.tsx`) toont momenteel alleen programma-items en coordinatiekosten. We voegen een "Logies" sectie toe met de gekoppelde accommodatie-offerte en bijbehorende extra's, analoog aan wat al is gedaan in de offerte-preview.

## Wat wordt toegevoegd

**Logies-sectie** (als nieuwe categorie-groep in de factuur-tabel):
- Accommodatienaam + partnernaam
- Aantal nachten (berekend uit arrival/departure)
- Totaalprijs
- BTW-tarief (standaard 9%)

**Logies extra's** (uit `accommodation_quote_extras`):
- Elke extra als aparte regel met naam, aantal, prijs en subtotaal
- Eigen BTW-tarief per extra

**Totaalberekening**: logies + extras worden opgenomen in de BTW-groepen en het eindtotaal.

## Technische wijzigingen

### Bestand: `src/pages/admin/AdminInvoicePreview.tsx`

1. **Nieuwe interfaces** toevoegen:
   - `AccommodationQuoteData` met velden: id, accommodation_name, partner_id, price_total, price_per_person_per_night, vat_rate, price_includes_vat, partner_name
   - `AccommodationExtraData` met velden: name, description, quantity, unit_price, pricing_type, vat_rate

2. **Nieuwe state**:
   - `accommodationQuote: AccommodationQuoteData | null`
   - `accommodationExtras: AccommodationExtraData[]`
   - `accommodationNights: number`

3. **fetchData uitbreiden**:
   - `program_requests` query al bevat `linked_accommodation_id` via de bestaande `requestData`
   - Als `linked_accommodation_id` aanwezig: `accommodation_requests` ophalen voor arrival/departure dates
   - Actieve quote ophalen (`status` in `['selected', 'submitted']`)
   - Partner-naam ophalen via aparte query op `partners`
   - `accommodation_quote_extras` ophalen voor die quote

4. **calculateTotals uitbreiden**:
   - Logiesprijs toevoegen aan de juiste BTW-groep (quote.vat_rate, standaard 9%)
   - Elke extra toevoegen aan zijn eigen BTW-groep
   - Resultaat automatisch meegenomen in subtotaal, BTW en eindtotaal

5. **Factuur-tabel uitbreiden** (na programma-categorieen, voor coordinatiekosten):
   - Categorie-header "Logies"
   - Regel voor accommodatie met nachten, prijs en totaal
   - Als er extra's zijn: categorie-header "Extra's bij logies"
   - Regels per extra met naam, aantal, prijs en subtotaal

6. **Sidebar** bijwerken:
   - Aantal posten tellen inclusief logies-items

