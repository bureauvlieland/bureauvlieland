## Doel

De "Uw Logiesaanvraag"-kaart in de Logies-tab (status *In behandeling*) toont nu enkel datum, gasten, type en aantal kamers. Alle overige door de klant ingegeven voorkeuren (kamerverdeling, kamertypes, locatievoorkeur, faciliteiten, budget, bijzondere wensen) worden verborgen, terwijl ze wel relevant zijn — zowel voor de klant ter controle als om begrip te geven over wat er met partners is gedeeld.

## Wijziging

Eén bestand: `src/components/customer-portal/AccommodationSection.tsx` (State 4 — "Waiting for quotes", regels ~545–674).

Onder het bestaande detail-grid en boven het status-/wacht-blok voegen we een uitklapbaar blok **"Uw wensen"** toe dat alleen wordt getoond als er minstens één extra veld is ingevuld. Default ingeklapt om de kaart compact te houden.

### Velden die we tonen (alleen indien gevuld)

| Veld (DB)                         | Label                | Render                                                            |
| --------------------------------- | -------------------- | ----------------------------------------------------------------- |
| `room_occupancy`                  | Kamerbezetting       | Label uit `ROOM_OCCUPANCY_OPTIONS`                                |
| `room_types[]`                    | Gewenste kamertypes  | Badges uit `ROOM_TYPES`                                           |
| `location_preference[]`           | Locatievoorkeur      | Badges uit `LOCATION_PREFERENCES` (icoon + label)                 |
| `facilities_required[]`           | Gewenste faciliteiten| Badges uit `FACILITIES`                                           |
| `budget_range`                    | Budget               | Label uit `BUDGET_RANGES`                                         |
| `special_requests`                | Bijzondere wensen    | Multi-line tekst (`whitespace-pre-line`)                          |

`admin_notes` blijft volgens uw keuze **niet zichtbaar** voor de klant (blijft intern).

### UI

- Sectie onder bestaand grid, boven status-banner.
- Header: kleine titel "Uw wensen" + chevron + "Bewerken"-link (hergebruikt bestaande `onEditAccommodation` indien aanwezig).
- Default `<details>`/collapsible ingeklapt; bij ≤2 ingevulde velden direct uitgeklapt tonen.
- Gebruikt bestaande `Badge`/`Card`-tokens — geen nieuwe design tokens.

### Niet in scope

- State 2 (gekozen offerte) en State 0 (cancelled) blijven ongewijzigd.
- Geen wijziging in datamodel of edge functions.
- Geen wijziging in de oude `AccommodationRequestSummary` op `/logies/:token` (legacy pagina).

## Bestanden

- `src/components/customer-portal/AccommodationSection.tsx` — uitbreiding van State 4 met "Uw wensen"-blok.
