## Doel

Op `/activiteiten-boeken`:
1. Activiteiten met dezelfde naam + dezelfde aanbieder + dezelfde dag bundelen tot één kaart, met alle vertrektijden in één rij.
2. De "Boeken"-knop opent niet langer de interne `MapBookingDialog`, maar stuurt de bezoeker direct door naar de boekingspagina van die activiteit op MijnActiviteitenPlanner (de "aanbieder eigen" pagina).

## Wijzigingen

### 1. `src/pages/ActiviteitenBoeken.tsx` — bundeling

In de `grouped`-memo activiteiten per dag verder groeperen op `ActivityTypeId + _partnerId`. Per groep:
- alle `Departure`-tijden verzamelen (gesorteerd, uniek)
- gecombineerde `RemainingSlots` (som)
- representatieve activiteit voor titel/prijs/afbeelding/aanbieder
- lijst van `{ id, time, slotsLeft }` voor de tijdblokken

De map ziet er dan uit als `Map<dateKey, Map<groupKey, BundledActivity>>`.

### 2. `src/components/map/MapActivityCard.tsx` — tijden tonen + directe link

- Prop uitbreiden met optionele `times?: { id: number; time: string; slotsLeft: number }[]`.
- Wanneer `times` aanwezig is en >1: de single `Clock`-regel vervangen door een rij badges/chips met alle tijden (bijv. `09:30`, `11:00`, `14:30`), elke chip toont aantal plekken via tooltip/title.
- Boekingsknop wordt een `<a>` (Button met `asChild`) naar:
  ```
  https://boeking.mijnactiviteitenplanner.nl/{partnerSlug}/{activityTypeSlug}/list
  ```
  met `target="_blank" rel="noopener"`.
  - `activityTypeSlug` = slugify(`ActivityTypeName`) (lowercase, diakrieten weg, spaties → `-`, niet-alfanumeriek weg). Dit komt overeen met het gebruikte patroon in `src/pages/Evenementen.tsx` (`/activiteiten-vlieland/bockbiertocht/list`).
  - Fallback wanneer slug onbekend: `https://boeking.mijnactiviteitenplanner.nl/{partnerSlug}`.

### 3. `MapBookingDialog` afkoppelen op deze pagina

`bookingActivity`-state, `onBook`-handler en `<MapBookingDialog />` uit `ActiviteitenBoeken.tsx` verwijderen — boeken gaat nu volledig via externe link. Component zelf blijft bestaan voor andere gebruikers (bv. partner-detailpagina).

### 4. Helper

Kleine `slugify`-helper inlinen in `MapActivityCard.tsx` (geen extra dependency).

## Geen DB- of edge-function-wijzigingen

Alleen front-end aanpassingen; MAP-API en `useAllMapActivities` blijven ongewijzigd.
