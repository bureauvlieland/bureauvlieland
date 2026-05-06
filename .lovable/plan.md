## Doel
Op de homepage een nieuwe rij tonen met de eerstvolgende 4 unieke activiteiten uit de live MAP API, als visuele teaser/CTA naar `/activiteiten-boeken`.

## Aanpak
Nieuwe component `src/components/home/UpcomingActivitiesFeed.tsx`:
- Gebruikt bestaande `useAllMapActivities(dateStart, dateEnd)` hook (vandaag t/m +14 dagen).
- Filtert vergangen tijden, sorteert op `Departure`, dedupliceert op `ActivityTypeId + _partnerId`, neemt de eerste 4.
- Toont een rij van 4 kaarten (responsive: 1 col mobiel, 2 tablet, 4 desktop) met:
  - afbeelding (`_image` met fallback gradient),
  - activiteit-naam (`ActivityTypeName`),
  - partner-naam,
  - datum + tijd (NL locale),
  - vrije plekken-badge.
- Hele kaart linkt naar `/activiteiten-boeken`.
- Section-header: titel "Eerstvolgende activiteiten" + korte intro + secundaire "Bekijk alle activiteiten →" knop.
- Loading skeletons; bij geen data → component rendert niets (geen lege rij).

In `src/pages/Index.tsx`: importeer en plaats `<UpcomingActivitiesFeed />` direct ná `<HeroEditorial />` en vóór `<ActivitiesShowcase />` (live agenda krijgt hogere prominentie dan de statische showcase).

## Out of scope
- Geen wijzigingen aan `/activiteiten-boeken` zelf.
- Geen booking-flow vanaf homepage; klik = doorklik naar boekingspagina.
- Geen filters/datepicker op de homepage.

## Bestanden
- Nieuw: `src/components/home/UpcomingActivitiesFeed.tsx`
- Aangepast: `src/pages/Index.tsx`
