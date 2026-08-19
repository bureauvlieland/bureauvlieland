# Duidelijke statussen op de klantpagina

Op /mijn-programma zag de klant bij elk onderdeel hetzelfde groene label "Door u goedgekeurd", terwijl de voortgangsbalk sprak over "2 van 3 partner onderdelen bevestigd". Daardoor is niet te zien welk onderdeel al bevestigd is, welk onderdeel nog op de aanbieder wacht, en welke onderdelen Bureau Vlieland zelf regelt.

## Wat er verandert

1. Drie onderscheidende labels per onderdeel (dagoverzicht + detail):
   - Bevestigd door aanbieder (groen) — aanbieder heeft bevestigd
   - Wacht op bevestiging aanbieder (amber) — u bent akkoord, aanbieder moet nog reageren
   - Geregeld door Bureau Vlieland (groen) — wij boeken dit zelf (overtocht, fietshuur, bagage)

2. Bureau-onderdelen gelden als bevestigd zodra de klant akkoord is. Ze tellen dus mee in de voortgang en krijgen een groen label, ook als de interne boeking nog loopt.

3. De voortgangsregel wordt begrijpelijk en compleet: bijvoorbeeld "5 van 6 onderdelen bevestigd — 1 onderdeel wacht nog op de aanbieder. 3 onderdelen regelt Bureau Vlieland zelf." Zo sluit de tekst aan op wat de klant in het dagoverzicht ziet.

4. Ook de Fietshuur/overtocht-varianten die onder een vervoerspartner vallen (Rederij Doeksen, fietsverhuur, bagagevervoer) worden als Bureau Vlieland-onderdeel geteld, precies zoals ze al in het overzicht worden gepresenteerd.

## Technisch

- `src/lib/itemStatus.ts`: `customerLabel` per status uit elkaar trekken — `geaccepteerd` → "Bevestigd door aanbieder", `klant_akkoord_wacht_partner` → "Wacht op bevestiging aanbieder" (amber i.p.v. groen), `klant_akkoord_bureau` → "Geregeld door Bureau Vlieland". Tooltips meelopen.
- `deriveItemDisplayStatus`: bureau-detectie via de bestaande `isBureauItem()` helper (`src/lib/bureauItem.ts`) i.p.v. de harde check `provider_id === "bureau"`, zodat vervoer van rederij/fietsverhuur/bagagevervoer ook `klant_akkoord_bureau` krijgt.
- `src/types/programRequest.ts` → `calculateStatusSummary`: `isItemTrulyConfirmed` laat bureau-items als bevestigd gelden bij klant-akkoord (`customer_accepted_at`/`customer_approved_at`) naast booking_reference/confirmed/executed; bureau/partner-splitsing ook via `isBureauItem()`.
- `src/components/customer-portal/ProgramStepper.tsx`: `buildProgramTrack` statusregel herschrijven naar totalen over alle onderdelen (bevestigd/openstaand) met bureau-toelichting; `providersDone` blijft gebaseerd op openstaande partner-items.
- Tests bijwerken/uitbreiden in `src/lib/__tests__/itemStatus.test.ts` en een casus voor `calculateStatusSummary` met bureau-items op `pending` + klant-akkoord.
