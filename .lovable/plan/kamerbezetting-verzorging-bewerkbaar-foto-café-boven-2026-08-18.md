# Kamerbezetting & verzorging bewerkbaar + foto Café Boven

Twee dingen in één keer: de logieswensen (kamerindeling en verzorging) worden overal invulbaar en zichtbaar, en de verkeerde foto bij Café Boven wordt vervangen.

## 1. Kamerbezetting & verzorging bewerkbaar

Nu staan kamerindeling en verzorging alleen als tekst in de admin (en ontbreken ze bij handmatig aangemaakte aanvragen). Dat wordt:

- **Admin — logiesaanvraag**: in de kaart "Groep & wensen" komen tegels **Kamers** (aantal kamers, bezetting, kamertypes) en **Verzorging** (alleen logies, logies & ontbijt, halfpension, volpension, all-inclusive, geen voorkeur), met een bewerk-dialoog.
- **Admin — nieuwe aanvraag aanmaken**: dezelfde velden in het aanmaakformulier, zodat een telefonische aanvraag direct compleet is.
- **Klantportaal**: de knop "Gegevens wijzigen" op de logieskaart laat de klant ook kamerbezetting en verzorging aanpassen. Wijzigingen worden gelogd in de projecthistorie.
- **Partnermail**: de gevraagde kamerconfiguratie en verzorging worden opgenomen in de offerte-aanvraagmail naar logiespartners, zodat de partner meteen goed kan prijzen.
- Alle plekken gebruiken één gedeeld formulier, zodat admin, klant en mail altijd hetzelfde tonen.

## 2. Foto Café Boven

De huidige afbeelding in de Café Boven-tip in de portaal-sidebar is een screenshot-in-screenshot. Die wordt vervangen door de aangeleverde sfeerfoto (feestavond bij Tante Pe). Bijschrift, link en styling blijven gelijk.

## Technisch

- Nieuw: `src/components/shared/AccommodationSetupFields.tsx` (velden `room_count`, `room_occupancy`, `room_types`, `board_preference` uit `src/types/accommodation.ts`).
- `src/pages/admin/AdminAccommodationDetail.tsx`: tegels + `EditAccommodationSetupDialog`, met cache-invalidatie na opslaan.
- `src/components/admin/AdminCreateAccommodationSheet.tsx`: velden bij aanmaken.
- `src/components/customer-portal/AccommodationSection.tsx` + `src/hooks/useCustomerProgram.ts`: bewerkdialoog voor klant.
- `supabase/functions/update-customer-program/index.ts`: nieuw `accommodationSetup`-blok, token-gevalideerd, met historie-log.
- `supabase/functions/send-accommodation-quote-request/index.ts`: kamer/verzorgingsblok in de mailtemplate.
- Foto: `lovable-assets create` op de upload → pointer in `src/assets/`, gebruikt in `src/components/customer-portal/ProgramSidebar.tsx`; oude `src/assets/cafe-boven.jpg` verwijderen.
- Tests: unit-tests op de samenvattings-/validatielogica van de logieswensen.
