
# Maatwerk-melding in klantportaal

## Probleem
Na het indienen van een maatwerk aanvraag (`program_type` = `maatwerk_zakelijk` of `maatwerk_prive`) wordt de klant doorgestuurd naar het klantportaal. Omdat Bureau Vlieland nog geen programma heeft samengesteld, is de pagina leeg en toont het onjuiste meldingen als "Aanvragen verstuurd naar aanbieders" en "0 activiteiten".

## Oplossing
De klant krijgt een duidelijke melding dat Bureau Vlieland bezig is met het samenstellen van het programma. Dit moet op meerdere plekken worden aangepast:

### 1. `ProgramOverviewCard.tsx` -- Titel en subtitel aanpassen
- Herkennen van `maatwerk_zakelijk` en `maatwerk_prive` als programmatype
- Bij 0 items: titel wordt "Uw maatwerkprogramma" en subtitel wordt "Bureau Vlieland stelt uw programma samen. Wij nemen contact met u op."
- Type-label wordt "Maatwerk" in plaats van "Meerdaags verblijf"

### 2. `ProgramIntroCard.tsx` -- Nieuwe toestand voor maatwerk-in-voorbereiding
- Wanneer `program_type` begint met `maatwerk_` en er 0 items zijn: toon een kaart met de boodschap dat Bureau Vlieland aan het werk is
- Tekst: "Bureau Vlieland is bezig met het samenstellen van uw programma op maat. Zodra het programma klaar is, vindt u het hier terug. Wij nemen contact met u op om uw wensen te bespreken."
- Visueel: een vriendelijke info-kaart (niet een waarschuwing)

### 3. `CustomerPortalSplash.tsx` -- Maatwerk-aware welkomstboodschap
- Bij maatwerk-type: werkdocument-banner aanpassen naar "Bureau Vlieland is uw programma aan het samenstellen"
- Programma-kaart: badge "In voorbereiding" en aangepaste tekst

### 4. `DesktopProgramView.tsx` en `MobileProgramView.tsx` -- Lege-staat aanpassen
- Wanneer maatwerk + 0 items: in plaats van "0 activiteiten" badge en lege dag-tabs, toon een placeholder-kaart met de maatwerk-melding
- Verberg de "Toevoegen" knop (klant hoeft zelf niets toe te voegen bij maatwerk)

### 5. `ProgramType` type uitbreiden
- In `src/types/programRequest.ts`: `ProgramType` uitbreiden met `"maatwerk_zakelijk" | "maatwerk_prive"`

## Technisch overzicht

| Bestand | Wijziging |
|---|---|
| `src/types/programRequest.ts` | `ProgramType` uitbreiden met maatwerk-types |
| `src/components/customer-portal/ProgramOverviewCard.tsx` | Titel/subtitel/type-label voor maatwerk |
| `src/components/customer-portal/ProgramIntroCard.tsx` | Nieuwe "maatwerk in voorbereiding" state |
| `src/components/customer-portal/CustomerPortalSplash.tsx` | Welkomstboodschap + programma-kaart aanpassen |
| `src/components/customer-portal/DesktopProgramView.tsx` | Lege-staat placeholder bij maatwerk |
| `src/components/customer-portal/MobileProgramView.tsx` | Idem voor mobiel |

## Wat niet verandert
- Database schema (geen migraties nodig)
- Edge functions
- De configurator / intake flow
- Bestaande self-service en quote flows
