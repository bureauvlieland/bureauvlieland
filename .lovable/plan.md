

# PDF verrijken met afbeeldingen en locatiekaarten

## Wat verandert er?
De programma-PDF die klanten downloaden wordt visueel aantrekkelijker:

- **Activiteitafbeelding**: een thumbnail (30x20mm) links naast de activiteitnaam en details
- **Statische kaart**: voor activiteiten met coordinaten een OpenStreetMap kaartje onder het blok
- **Locatie blijft klikbaar**: de bestaande Google Maps link blijft behouden

## Visueel resultaat per activiteit

```text
+--------------------------------------------------+
| Dag 1 - Maandag 14 juli                          |
+--------------------------------------------------+
| +--------+  Strandspektakel                       |
| |  foto  |  14:00  *  2u  *  Vlieland Events     |
| |        |  Exclusieve strandactiviteit...        |
| +--------+  Locatie: Badweg 1, Vlieland           |
|                                                   |
|  +-------------------------------------------+    |
|  |          [statische kaart]                 |    |
|  +-------------------------------------------+    |
+---------------------------------------------------+
```

## Technische aanpak

### Bestand: `src/components/customer-portal/ProgramPdfDownload.tsx`

**1. Helper: afbeelding laden als base64**

Een `loadImageAsBase64(url)` functie die:
- Een `Image()` element aanmaakt met `crossOrigin = "anonymous"`
- Via een canvas naar JPEG base64 converteert (jsPDF kan geen externe URLs)
- Bij CORS-fouten of timeouts graceful `null` retourneert
- Timeout van 5 seconden per afbeelding

**2. Afbeeldingen voorladen**

Voor het tekenen van de PDF worden alle afbeeldingen parallel geladen:
- Activiteitafbeeldingen via `image_url` (al beschikbaar in de items data)
- Lokale assets via `image_asset` (resolved via `getBlockImage` helper uit `buildingBlockUtils.ts`)
- Statische kaarten via OpenStreetMap: `https://staticmap.openstreetmap.de/staticmap.php?center={lat},{lng}&zoom=15&size=600x200&markers={lat},{lng},red-pushpin`

**3. Layout per activiteit aanpassen**

Huidige layout: tekst op volle breedte.
Nieuwe layout wanneer afbeelding beschikbaar:
- Links: thumbnail 30mm breed x 20mm hoog
- Rechts (offset 34mm): activiteitnaam, metadata, beschrijving
- Onder het blok: statische kaart (contentWidth x 22mm) indien coordinaten aanwezig

`checkPage` wordt aangepast om de grotere hoogte per item te accommoderen (afbeelding ~25mm + kaart ~27mm).

**4. Graceful fallback**

Als een afbeelding niet laadt (CORS, 404, timeout):
- Item wordt gewoon zonder afbeelding gerenderd (huidige layout)
- Geen foutmelding voor de gebruiker
- Kaart wordt ook overgeslagen als coordinaten ontbreken

### Geen andere bestanden wijzigen

De items bevatten al `image_url`, `image_asset`, `location_lat`, `location_lng` en `location_address` vanuit de `useCustomerProgram` hook. Geen database- of edge function-wijzigingen nodig.

### Aandachtspunten
- **Laadtijd**: afbeeldingen worden parallel geladen, maar de PDF-generatie duurt 2-5 seconden langer afhankelijk van het aantal activiteiten. De loading spinner is al aanwezig.
- **CORS**: Supabase Storage URLs ondersteunen CORS. OpenStreetMap static map service staat cross-origin toe. Lokale assets worden via import resolved en werken altijd.
- **Bestandsgrootte**: JPEG-compressie (kwaliteit 0.7) houdt de PDF compact.

