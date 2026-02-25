
# Betere communicatie bij geannuleerde en afgewezen items voor partners

## Probleem

Partners worden onvoldoende geinformeerd over twee scenario's:
1. **Programma geannuleerd**: Items worden op "Geannuleerd" gezet maar verdwijnen naar de "Afgerond" tab zonder opvallende melding
2. **Logiesofferte afgewezen** (andere partner gekozen): Status wordt "Niet gekozen" maar de partner ziet dit alleen als ze actief in "Afgerond" kijken

## Oplossing

### 1. Visuele indicator voor recent geannuleerde/afgewezen items

In de `PartnerUnifiedList` een tijdelijke visuele indicator tonen voor items die recent (< 48 uur) zijn geannuleerd of afgewezen. Dit werkt vergelijkbaar met de bestaande "Nieuw" en "Gewijzigd door klant" indicators.

**Bestand**: `src/components/partner-portal/PartnerUnifiedList.tsx`
- Bij het mappen van items: detecteer of een item recent is geannuleerd/afgewezen (op basis van `updated_at` < 48 uur)
- Toon een rode/oranje dot of badge naast het item
- Voeg een count-indicator toe aan de "Afgerond" tab wanneer er recent geannuleerde/afgewezen items zijn

### 2. Annuleringsreden zichtbaar maken in detail-sheets

**Bestand**: `src/components/partner-portal/PartnerItemSheet.tsx`
- Bij status `cancelled`: toon een alert-blok met "Deze aanvraag is geannuleerd door de klant" en eventueel de annuleringsreden (uit `program_requests.cancellation_reason`)

**Bestand**: `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx`
- Bij status `rejected`: toon contextinformatie:
  - Als het programma is geannuleerd: "De hele aanvraag is geannuleerd"
  - Als een andere partner is gekozen: "De klant heeft voor een andere accommodatie gekozen"

### 3. "Afgerond" tab opsplitsen met subtitels

**Bestand**: `src/components/partner-portal/PartnerUnifiedList.tsx`
- In de "Afgerond" tab: groepeer items visueel met subheadings:
  - "Uitgevoerd / Gefactureerd" (positief afgerond)
  - "Geannuleerd / Afgewezen" (negatief afgerond)
- Dit maakt het direct duidelijk welke items positief en welke negatief zijn afgerond

### 4. Reden-context meegeven vanuit de database

**Data**: De `program_requests` tabel heeft al een `cancellation_reason` veld. Voor logiesoffertes checken we of de `accommodation_requests` status `cancelled` is (hele aanvraag geannuleerd) versus dat er een andere quote `selected` is (andere partner gekozen).

**Bestand**: `src/hooks/usePartnerDashboard.ts`
- Bij het ophalen van items: voeg `cancellation_reason` toe vanuit de gerelateerde `program_requests`
- Bij accommodation quotes: voeg context toe over waarom de offerte is afgewezen

## Technische details

### Gewijzigde bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/partner-portal/PartnerUnifiedList.tsx` | Recent-geannuleerd indicator, subgroepen in Afgerond tab |
| `src/components/partner-portal/PartnerItemSheet.tsx` | Annuleringsreden alert-blok tonen |
| `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx` | Context bij afwijzing tonen |
| `src/hooks/usePartnerDashboard.ts` | Annuleringsreden en afwijzingscontext ophalen |
| `src/types/partner.ts` | Optioneel veld `cancellation_reason` toevoegen aan PartnerItem type |

### Geen database-wijzigingen nodig
Alle benodigde data (cancellation_reason, status, updated_at) is al beschikbaar in de bestaande tabellen.
