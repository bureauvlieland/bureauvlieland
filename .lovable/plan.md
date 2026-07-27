## Vier fixes voor de programma-configurator

### 1. E-bike wordt niet toegevoegd — verkeerde block-ID
**Oorzaak (bevestigd via DB):** `src/lib/programWizardCart.ts` hardcodeert `FIETS_EBIKE_ID = "fiets-huur-kopie"`, maar dat is een oud concept (`is_published=false`). Het echte gepubliceerde e-bike-blok heet **`fiets-huur-kopie-2`** ("Fietshuur (E-bike)", published/active).

**Fix:**
- `FIETS_EBIKE_ID` in `src/lib/programWizardCart.ts` aanpassen naar `"fiets-huur-kopie-2"`.
- Bijbehorende Vitest test (`programWizardCart.test.ts`) meebijwerken zodat de nieuwe ID de asserties dekt.
- Opschoning: de ongebruikte oude conceptrij `fiets-huur-kopie` verwijderen uit `building_blocks` (voorkomt verwarring). Alleen doen als geen enkele bestaande cart/template/request ernaar verwijst — dat check ik eerst.

### 2. Volgorde in "Gebruik dit programma"-preview klopt niet altijd
**Oorzaak (geverifieerd):** `src/components/programmas/ProgramTimeline.tsx` sorteert alleen op `preferred_time` wanneer *beide* items een tijd hebben, anders puur op `sort_order`. Bij gemengde dagen (deel met tijd, deel zonder) klopt de volgorde niet.

**Fix:** één stabiele sort — items mét tijd chronologisch eerst, items zonder tijd erna op `sort_order`. Zelfde helper hergebruiken waar nodig.

### 3. Erwin's voorstel bevat geen tijden
**Oorzaak (geverifieerd):** de edge function `generate-program-suggestion` retourneert wél `preferred_time`, maar `src/components/configurator/AiErwinDialog.tsx` (regel 79-84) zet `preferredTime: null` bij het mappen naar cart-items.

**Fix:** in `AiErwinDialog.tsx` het `preferred_time` veld uit de suggestie doorzetten naar `preferredTime` (met normalisatie: leeg/invalid → `null`, formaat `HH:MM`).

### 4. Voorbeeldprogramma's duidelijker aanbieden
Op `/programma-samenstellen` (fase "program") staat de template-picker verstopt. Uitbreiden met:
- Een prominente **"Snel starten met een voorbeeldprogramma"**-banner bovenaan de `ProgramBuilderView`, zichtbaar zolang de klant nog geen echte inhoud heeft toegevoegd (alleen ferry/bikes in de cart).
- Subtiele pulse-animatie (Tailwind `animate-pulse`) op een badge/icoon naast de CTA — niet de hele knop.
- Verdwijnt zodra ≥2 niet-transport items in de cart staan, óf na expliciete "Verberg"-klik (localstorage-vlag per sessie).

### Technische details

**Bestanden om aan te passen:**
- `src/lib/programWizardCart.ts` — ID-constante
- `src/lib/__tests__/programWizardCart.test.ts` — testverwachtingen
- `src/components/programmas/ProgramTimeline.tsx` — sortering
- `src/components/configurator/AiErwinDialog.tsx` — preferred_time doorzetten
- `src/components/configurator/ProgramBuilderView.tsx` — nieuwe banner
- Migration/insert: oude `fiets-huur-kopie` opruimen (alleen na references-check)

**Nog te verifiëren tijdens uitvoering:**
- Of `fiets-huur-kopie` (oud concept) nog gerefereerd wordt vanuit `program_template_items`, `program_request_items`, of ergens in de code — anders laten staan en alleen negeren.
- Of de admin-preview van templates (`AdminTemplates`) dezelfde `ProgramTimeline` gebruikt (dan lift die automatisch mee).
