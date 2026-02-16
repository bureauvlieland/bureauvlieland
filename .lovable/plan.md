

# Locaties tonen in klantportaal en PDF met navigatielink

## Samenvatting

Naast het toevoegen van locatievelden aan de admin-schermen (vorig plan), worden locaties ook zichtbaar gemaakt in het klantportaal en de PDF-download. Klanten kunnen direct vanuit het programma navigeren naar de locatie via Google Maps (of hun standaard navigatie-app op mobiel).

## Wat verandert

### 1. Database: locatievelden op `program_request_items`
Drie nieuwe kolommen (onderdeel van het eerder goedgekeurde plan):
- `location_lat` (numeric)
- `location_lng` (numeric)
- `location_address` (text)

### 2. Admin sheets: locatie meegeven bij toevoegen/bewerken
Bij het selecteren van een bouwsteen worden `location_lat`, `location_lng` en `location_address` automatisch overgenomen. De admin kan dit aanpassen via de bestaande `LocationPicker`.

### 3. Type-definitie uitbreiden
`ProgramRequestItem` in `src/types/programRequest.ts` krijgt drie nieuwe optionele velden zodat de `(item as any)` casts vervangen worden door getypte velden.

### 4. Klantportaal: locatie tonen met navigatielink
In `CustomerProgramItem.tsx` wordt de bestaande locatieregel (die al `(item as any).location_address` toont) uitgebreid:
- Het adres wordt een klikbare link
- Op klik opent `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` -- dit opent Google Maps met routebeschrijving
- Op mobiel opent dit automatisch de Google Maps app (of Apple Maps als die als standaard is ingesteld)
- Icoon en tekst maken duidelijk dat je kunt navigeren ("Route" linkje naast het adres)

### 5. PDF: locatie met navigatielink
In `ProgramPdfDownload.tsx` wordt de locatieregel aangepast:
- Adres wordt getoond als klikbare PDF-link naar Google Maps
- Klanten kunnen vanuit de gedownloade PDF direct op de locatie klikken om te navigeren

## Technische details

### Bestanden die worden aangepast

1. **Migratie** (nieuw)
   ```sql
   ALTER TABLE program_request_items
     ADD COLUMN location_lat numeric,
     ADD COLUMN location_lng numeric,
     ADD COLUMN location_address text;
   ```

2. **`src/types/programRequest.ts`**
   - Drie velden toevoegen aan `ProgramRequestItem`:
     ```
     location_lat: number | null;
     location_lng: number | null;
     location_address: string | null;
     ```

3. **`src/components/admin/AdminAddActivitySheet.tsx`**
   - State voor lat/lng/address
   - In `handleSelectBlock`: locatie overnemen van bouwsteen
   - LocationPicker renderen in formulier
   - Locatievelden meesturen bij insert

4. **`src/components/admin/AdminEditActivitySheet.tsx`**
   - State voor lat/lng/address
   - Locatie laden uit item in useEffect
   - LocationPicker renderen
   - Locatievelden meesturen bij update
   - Interface uitbreiden met locatievelden

5. **`src/components/customer-portal/CustomerProgramItem.tsx`**
   - Bestaande locatieregel aanpassen: adres wordt klikbare link naar Google Maps route
   - Toevoegen van een klein "Route" linkje met navigatie-icoon
   - Google Maps URL: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`
   - Als alleen adres zonder coordinaten: `https://www.google.com/maps/search/?api=1&query={address}`

6. **`src/components/customer-portal/ProgramPdfDownload.tsx`**
   - Locatieregel aanpassen: adres als klikbare PDF-link (jsPDF `textWithLink`)
   - Link naar dezelfde Google Maps URL

### Google Maps navigatie-URL
De URL `https://www.google.com/maps/dir/?api=1&destination=53.2967,5.0456` werkt op alle platforms:
- Desktop: opent Google Maps in de browser
- Android: opent de Google Maps app
- iOS: biedt de keuze tussen Apple Maps en Google Maps

### Voorbeeld weergave klantportaal

In de uitgeklapte details van een activiteit:

```
[pin-icoon] Dorpsstraat 99, Vlieland  [navigatie-icoon Route]
```

De hele regel is klikbaar en opent de routeplanner.
