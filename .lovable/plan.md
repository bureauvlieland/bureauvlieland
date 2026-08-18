# Kamerbezetting en verzorging invullen bij de logiesaanvraag

## Wat er nu is

De velden bestaan al in de database (`accommodation_requests.room_count`, `room_occupancy`, `room_types`, `board_preference`) en de klant kan ze invullen in de logieswizard. Wat ontbreekt: in de admin-aanvraagpagina zijn ze **alleen leesbaar** — de kamerkaart verschijnt zelfs pas als er al een aantal staat, en verzorging staat er helemaal niet. Een aanvraag die jij zelf aanmaakt (Nieuwe logiesaanvraag) vraagt alleen om aantal gasten. Daarom kun je bij LOG-2608-0001 niets invullen.

## Wat we bouwen

### 1. Bewerkbaar blok "Kamers & verzorging" op de aanvraagpagina
- De kaart "Aanvraagdetails" toont altijd twee tegels: **Kamers** (`10 kamers × 1 pers.`) en **Verzorging** (`Logies & ontbijt`), met "Nog niet opgegeven" als het leeg is, plus een potlood-knop.
- Nieuw dialoogje met:
  - Aantal kamers (met suggestie op basis van gasten ÷ bezetting);
  - Bezetting per kamer (bestaande keuzelijst 1/2/3/4-persoons);
  - Kamertype-voorkeuren (optioneel, bestaande checkboxes);
  - Verzorging (Logies, Logies & ontbijt, Halfpension, Volpension, All-inclusive, Geen voorkeur).
- Opslaan schrijft naar de aanvraag, logt de wijziging in het communicatie-/historieklog en verversen de weergave.

### 2. Ook invulbaar bij het aanmaken van een aanvraag
Hetzelfde blok (kamers, bezetting, verzorging) toevoegen aan "Nieuwe logiesaanvraag" in admin, zodat het al vanaf het begin klopt.

### 3. Meesturen naar de logiespartner
De offerte-aanvraagmail krijgt de kamerbezetting en de gevraagde verzorging in het aanvraagblok, zodat partners direct de juiste kamers en verzorging kunnen aanbieden. De partner-offerte houdt zijn eigen (definitieve) verzorgingsveld — de aanvraag is de wens, de offerte het aanbod.

### 4. Zichtbaarheid richting klant
De gevraagde verzorging en kamerbezetting worden meegenomen in de weergave van de aanvraag in het klantportaal (logiesblok), zodat de klant ziet wat er is uitgevraagd.

## Technisch

- Geen migratie nodig: kolommen bestaan al. `board_preference` staat al in `src/types/accommodation.ts` (`BOARD_PREFERENCE_OPTIONS`, `getBoardLabel`).
- Nieuwe component `src/components/admin/EditAccommodationSetupDialog.tsx` (kamers + bezetting + types + verzorging), hergebruikt `ROOM_TYPES`, `ROOM_OCCUPANCY_OPTIONS`, `BOARD_PREFERENCE_OPTIONS`.
- Aanpassingen: `src/pages/admin/AdminAccommodationDetail.tsx` (tegels altijd tonen + dialog + update/refetch + historie-log), `src/components/admin/AdminCreateAccommodationSheet.tsx` (extra velden in insert), `src/components/admin/SendAccommodationQuoteRequestDialog.tsx` en `supabase/functions/send-accommodation-quote-request/index.ts` (kamers/verzorging in mailtekst), klantportaal-logiesblok.
- Tests: unit tests op de kamer-suggestie/validatie-helper (aantal kamers ≥ 1, bezetting × kamers ≥ gasten geeft waarschuwing, verzorgingslabel-fallback) toevoegen aan de bestaande suite.
