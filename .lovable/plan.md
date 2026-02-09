

# Logiesaanvragen toevoegen aan partner detailpagina

## Wat ontbreekt
De partner detailpagina (`AdminPartnerDetail.tsx`) toont alleen gerelateerde **programma-aanvragen** (activiteiten). Voor partners van het type "accommodation" of "both" ontbreken de gerelateerde **logiesaanvragen** (accommodation quotes).

## Wijzigingen

### 1. Logies aanvragen ophalen
Een nieuwe functie `fetchRelatedAccommodationQuotes` toevoegen die:
- Alle `accommodation_quotes` ophaalt waar `partner_id` gelijk is aan de huidige partner
- De bijbehorende `accommodation_requests` meeneemt (klantnaam, periode, gasten, status)
- Alleen getoond wordt als `partner_type` gelijk is aan "accommodation" of "both"

### 2. Nieuwe sectie "Gerelateerde logiesaanvragen"
Een extra Card-sectie toevoegen onder (of naast) de bestaande "Gerelateerde aanvragen", met een tabel die toont:
- **Accommodatie** -- naam van de offerte
- **Klant** -- naam en eventueel bedrijf
- **Periode** -- aankomst- en vertrekdatum
- **Gasten** -- aantal gasten
- **Status** -- badge (Te beantwoorden / Offerte verstuurd / Gekozen / Afgewezen)
- **Link** -- knop naar de logies detail pagina (`/admin/logies/{request_id}`)

### 3. Conditie
De sectie wordt alleen gerenderd als de partner van het type "accommodation" of "both" is, zodat het niet verschijnt bij pure activiteitenpartners.

## Technisch

### Bestand
- `src/pages/admin/AdminPartnerDetail.tsx`

### Data model
Nieuw interface `RelatedAccommodationQuote` met velden uit `accommodation_quotes` + geneste `accommodation_requests`.

### Query
```sql
SELECT *, accommodation_requests(...)
FROM accommodation_quotes
WHERE partner_id = :partnerId
ORDER BY created_at DESC
LIMIT 10
```

### Weergave
Hergebruik van dezelfde status-mapping als in `PartnerAccommodationTable.tsx`:
- pending -> "Te beantwoorden"
- submitted -> "Offerte verstuurd"
- selected -> "Gekozen"
- rejected -> "Niet gekozen"
- expired -> "Verlopen"

