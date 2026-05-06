## Detail-sheet + cross-sell op /activiteiten-boeken

Houdt bezoekers langer op de site door eerst een rijke detailweergave te tonen voor ze naar MAP doorklikken, en een zachte cross-sell naar onze eigen flows.

### Nieuwe component: `MapActivityDetailSheet`
Locatie: `src/components/map/MapActivityDetailSheet.tsx`. Gebaseerd op shadcn `Sheet` (right side, breed: `sm:max-w-xl lg:max-w-2xl`).

**Inhoud (top → bottom):**
1. Hero-foto van de activiteit (groot, full-width binnen sheet)
2. Titel + partner-naam (klikbaar naar `/partners` indien mogelijk)
3. Badges: Direct boekbaar, restplekken-status
4. Volledige beschrijving (geen line-clamp)
5. Meta-grid: datum, duur, max personen, prijs p.p. (+ kindprijs), eventueel notes
6. **Vertrektijden** als grote knoppen-grid: elke tijd toont restplekken; klik op tijd = open MAP-boekings-URL in nieuwe tab (`target="_blank"`, `rel="noopener noreferrer"`).
7. Disclaimer-strip: "U boekt rechtstreeks bij {partner}. De boekingspagina opent in een nieuw venster." met `ExternalLink` icoon.
8. **Cross-sell footer** (zie hieronder)

### Cross-sell strip (in de sheet, onderaan)
Drie compacte kaarten naast elkaar (stack op mobiel):
- "Ook overnachten?" → `/logies-aanvragen` (Bed-icoon)
- "Compleet programma?" → `/programma-samenstellen` (Sparkles-icoon)
- "Catering of fietsen?" → `/diensten` (UtensilsCrossed-icoon)

Tekst kort, één regel CTA. Subtiele kaarten met `border` + `hover:bg-accent/50`.

### Wijzigingen in `MapActivityCard`
- De hele kaart wordt klikbaar (`onClick` op de Card → opent sheet via callback `onSelect`).
- Huidige "Boeken"-knop blijft bestaan, maar krijgt `e.stopPropagation()` zodat directe click direct naar MAP gaat (power-user pad).
- Cursor pointer + subtiele hover state al aanwezig.

### Wijzigingen in `ActiviteitenBoeken.tsx`
- State: `selectedBundle: BundledActivity | null`.
- `MapActivityCard` krijgt `onSelect={() => setSelectedBundle(bundle)}` prop.
- Render `<MapActivityDetailSheet bundle={selectedBundle} onClose={() => setSelectedBundle(null)} />` op page-niveau.

### Datacontract sheet
Sheet ontvangt `bundle: BundledActivity` (representative + alle times + partner-info). Geen extra fetches nodig — alle data zit al in de bundle.

### Tracking (optioneel, low effort)
`window.dataLayer?.push({ event: "activity_detail_open", activityType, partner })` bij sheet-open en `event: "activity_book_click"` bij klik op vertrektijd. Helpt later effect meten.

### Niet in scope
- Geen iframe naar MAP (X-Frame-Options + mobiele beleving).
- Geen eigen checkout (geen MAP booking-API).
- Geen wijzigingen aan de filter/zoek/lazy-load logica.

### Bestanden
- **Nieuw:** `src/components/map/MapActivityDetailSheet.tsx`
- **Aangepast:** `src/components/map/MapActivityCard.tsx`, `src/pages/ActiviteitenBoeken.tsx`
