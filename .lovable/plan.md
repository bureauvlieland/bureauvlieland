

## Plan: Afbeeldingen toevoegen aan activiteitenkaarten

De MAP API heeft **geen** afbeeldingen op het activities-endpoint, maar het **activitytypes**-endpoint heeft wel een `Image` veld. We matchen die via `ActivityTypeId`.

### Aanpak

**1. `useAllMapActivities` hook uitbreiden** (`src/hooks/useMapActivities.ts`)
- Per partner naast activities ook activitytypes ophalen (parallel)
- Image uit activitytype koppelen aan elke activity via `ActivityTypeId`
- Toevoegen als `_image: string | null` aan het resultaat

**2. `MapActivity` type uitbreiden**
- Optioneel `_image?: string` veld toevoegen aan het enriched type

**3. `MapActivityCard.tsx` aanpassen**
- Afbeelding tonen boven of naast de kaart als `_image` beschikbaar is
- Fallback naar placeholder als er geen afbeelding is

### Bestanden

| Actie | Bestand |
|-------|---------|
| Wijzig | `src/hooks/useMapActivities.ts` — activitytypes meefetchen, image koppelen |
| Wijzig | `src/components/map/MapActivityCard.tsx` — afbeelding tonen |

