
# Plan: Locatie bij bouwstenen + PDF-download programma

## Overzicht
Twee nieuwe features:
1. **Locatieveld bij bouwstenen** -- adres/coordinaten opslaan en tonen op een kaart (OpenStreetMap via Leaflet, geen API key nodig)
2. **PDF-download voor klanten** -- compleet programma-overzicht zonder prijzen, met locatie, data/tijd en omschrijvingen

---

## 1. Locatieveld voor bouwstenen

### Database-migratie
Drie nieuwe kolommen toevoegen aan `building_blocks`:

```text
location_lat    NUMERIC   (nullable) -- breedtegraad
location_lng    NUMERIC   (nullable) -- lengtegraad
location_address TEXT      (nullable) -- leesbaar adres, bijv. "Dorpsstraat 99, Vlieland"
```

Geen RLS-wijzigingen nodig -- bestaande policies dekken deze kolommen automatisch.

### Nieuwe dependency
- `leaflet` + `react-leaflet` (gratis OpenStreetMap tiles, geen API key)

### Nieuw component: `LocationPicker.tsx`
Interactieve kaart-component voor admin gebruik:
- Gecentreerd op Dorpsstraat Vlieland (53.2967, 5.0456), zoom ~15
- Klikbaar: klik op kaart plaatst een marker en vult lat/lng in
- Tekstveld voor adres (handmatige invoer)
- Optioneel: zoekfunctie via Nominatim (gratis OpenStreetMap geocoder) om een adres te zoeken en de kaart te centreren
- Geeft `lat`, `lng` en `address` terug via callback

### Aanpassing: `BuildingBlockSheet.tsx`
- Schema uitbreiden met `location_lat`, `location_lng`, `location_address`
- Nieuw tab "Locatie" toevoegen (of sectie onder "Algemeen")
- `LocationPicker` component integreren
- Reset/load bestaande waarden bij bewerken

### Aanpassing: `BuildingBlock` type
- Drie nieuwe velden toevoegen aan de TypeScript interface en het formulier-type

### Locatie tonen in klantportal: `CustomerProgramItem.tsx`
- In de uitklapbare details: als `location_address` beschikbaar is, toon het adres met een MapPin-icoon
- Optioneel: kleine statische kaartpreview (embed via OpenStreetMap iframe of mini Leaflet kaart)

### Locatie tonen in configurator: `BuildingBlockCard.tsx` / `BuildingBlockListItem.tsx`
- Kleine MapPin-icoon + adres tonen in de meta-informatie als er een locatie is ingesteld

---

## 2. PDF-download programma (klant)

### Nieuw component: `ProgramPdfDownload.tsx`
Een knop + verborgen render-container die een PDF genereert via de bestaande `jsPDF` + `html2canvas` methode (al in het project gebruikt bij `AdminQuotePreview`).

PDF-inhoud (zonder prijzen):
- Header: logo + "Programma [bedrijfsnaam/klantnaam]"
- Data en aantal personen
- Per dag:
  - Dagnaam + datum
  - Per activiteit: naam, omschrijving, tijd, duur, aanbieder, locatie (adres)
- Footer: "Samengesteld door Bureau Vlieland" + datum

### Integratie
- Download-knop toevoegen in `DesktopProgramView.tsx` (header area) en `MobileProgramView.tsx`
- De PDF render-container is een off-screen `div` (position absolute, left -9999) die alleen wordt gerenderd bij het genereren

---

## Technische details

| Bestand | Actie |
|---|---|
| **Database** | Migratie: 3 kolommen toevoegen aan `building_blocks` |
| `src/types/buildingBlock.ts` | `location_lat`, `location_lng`, `location_address` toevoegen |
| `src/components/admin/LocationPicker.tsx` | **Nieuw** -- kaart-picker met Leaflet |
| `src/components/admin/BuildingBlockSheet.tsx` | Locatievelden toevoegen aan formulier |
| `src/components/customer-portal/CustomerProgramItem.tsx` | Locatie tonen in details |
| `src/components/configurator/BuildingBlockCard.tsx` | MapPin + adres tonen |
| `src/components/configurator/BuildingBlockListItem.tsx` | MapPin + adres tonen |
| `src/components/customer-portal/ProgramPdfDownload.tsx` | **Nieuw** -- PDF-generator |
| `src/components/customer-portal/DesktopProgramView.tsx` | Download-knop toevoegen |
| `src/components/customer-portal/MobileProgramView.tsx` | Download-knop toevoegen |

### Dependencies toe te voegen
- `leaflet` (kaartbibliotheek)
- `react-leaflet` (React wrapper)
- `@types/leaflet` (TypeScript types)

### Centrum van de kaart
Dorpsstraat, Vlieland: **53.2967, 5.0456** -- standaard center en zoom level 15.
