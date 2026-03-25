

## Plan: MAP afbeelding-URL's fixen

De `Image` waarden uit de API zijn UUID's. De volledige URL is:
`https://portal.mijnactiviteitenplanner.nl/File/Get?reference={uuid}`

### Wijziging

**`src/hooks/useMapActivities.ts`** — helper toevoegen die UUID omzet naar volledige URL:

```typescript
const mapImageUrl = (ref: string | null) =>
  ref ? `https://portal.mijnactiviteitenplanner.nl/File/Get?reference=${ref}` : null;
```

Toepassen op twee plekken:
1. In `useAllMapActivities` waar `_image` wordt gezet vanuit de `typeImageMap`
2. In `useMapActivityTypes` resultaat (optioneel, voor hergebruik)

Geen andere bestanden nodig — `MapActivityCard.tsx` gebruikt `_image` al correct als `src`.

