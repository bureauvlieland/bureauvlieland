
# Klantpagina: duidelijker per tab, één traject-lint

## Probleem

Elke tab (Logies, Programma, Praktisch, Facturatie, Akkoord) opent met dezelfde twee blokken:
1. `ProgramStepper` — "Uw aanvraag" / "Uw voorstel" voortgang
2. `ProgramOverviewCard` — datums, personen, referentie, status

Daardoor lijkt elke tab op elkaar en zie je niet meteen waar je bent. Ook is het traject op de Overzicht-pagina (`CustomerPortalSplash` — kolom met Logies- en Programma-kaartjes) visueel iets totaal anders dan de stepper bovenaan de tabs. Inconsistent.

## Doel

- Elke tab heeft één **tab-eigen header** die direct zegt: "dit is de Logies-tab / Programma-tab / …", met de status van precies dát onderwerp.
- Eén **traject-lint** dat overal hetzelfde oogt — op de Overzicht-pagina én bovenaan de tabs — zodat de klant zich altijd kan plaatsen ("waar zit ik in het proces?").
- Geen dubbele "Uw aanvraag/Uw voorstel"-kaarten meer op elke tab.

## Aanpak

### 1. Eén `JourneyRibbon` component (nieuw)

Eén dunne horizontale balk, twee parallelle tracks (Logies + Programma), met huidige stap gemarkeerd. Wordt:
- **Op Overzicht** groot getoond als hoofdfocus (vervangt de huidige kolom met twee kaartjes als hero, of wordt erboven gezet — zie keuze hieronder).
- **Op elke tab** in compacte variant (1 regel hoog, sticky onder de tab-balk) — vervangt de huidige `ProgramStepper`.

Visueel hetzelfde lint, twee densities (`variant="full" | "compact"`). Klikbaar: een stap aanklikken springt naar de juiste tab/sectie.

### 2. Tab-headers (nieuw, per tab)

Elke tab krijgt een korte, tab-specifieke header bovenaan de content (ná het lint, in plaats van de generieke `ProgramOverviewCard`):

| Tab | Titel | Subregel | Status-badge |
|---|---|---|---|
| Logies | "Uw logies" | "Vergelijk offertes en kies waar u slaapt." | aantal offertes / gekozen |
| Programma | "Uw programma" | "Bekijk de activiteiten en geef per onderdeel akkoord." | X/Y bevestigd |
| Praktisch | "Praktische info" | "Boot, fietsen, bagage, kaart." | — |
| Facturatie | "Facturatiegegevens" | "Aan wie sturen we de factuur?" | compleet / onvolledig |
| Akkoord | "Akkoord & voorwaarden" | "Laatste stap: bevestig en onderteken." | ondertekend / open |

De `ProgramOverviewCard` (datums, personen, kenmerk) wordt verplaatst naar de **Overzicht-tab** als enige plek (waar hij thuishoort als "samenvatting van de aanvraag"). Op andere tabs verdwijnt hij — datums/personen staan al in het lint en/of de tab-header als chip.

### 3. Overzicht-pagina herzien

`CustomerPortalSplash` wordt:
- Hero-foto (blijft).
- Welkom + datums + personen + kenmerk (compact, één regel chips).
- **`JourneyRibbon` variant="full"** — vervangt de twee losse kaartjes "Logies" + "Programma" als primaire visual.
- Daaronder kort blok "wat is de eerstvolgende stap?" met één CTA (de actuele actie).
- Contact onderaan.

Zo zien klanten op de Overzicht-pagina precies dezelfde tracks/stappen als wat ze later compact terugzien op elke tab — leerbaar en consistent.

### 4. Stepper opruimen

`ProgramStepper.tsx` wordt vervangen door `JourneyRibbon`. De huidige interne logica (`buildLodgingTrack`, `buildProgramTrack`, `accommodationQuoteReceivedCount`, `customerApprovedCount`, enz.) blijft 1-op-1 gehandhaafd in `JourneyRibbon` — alleen de presentatie verandert en er komt een `variant` prop bij.

### Terminologie (consistent overal)

- "Logies-offertes" (niet "logies-aanbieders")
- "Programma-onderdelen" (niet "activiteiten" in stappen, wel toegestaan in vloeiende tekst)
- "Goedkeuren" = klant-actie, "Bevestigen" = aanbieder-actie
- "Uw aanvraag" verdwijnt als kop op tabs (wordt verwarrend) — komt alleen nog terug op Overzicht.

## Bestanden

**Nieuw**
- `src/components/customer-portal/JourneyRibbon.tsx` — vervanger van `ProgramStepper`, met `variant="full" | "compact"`
- `src/components/customer-portal/TabHeader.tsx` — herbruikbare tab-eigen header (titel + subregel + status-badge + chips)

**Aangepast**
- `DesktopProgramView.tsx` + `MobileProgramView.tsx` — `ProgramStepper` → `JourneyRibbon variant="compact"`; `ProgramOverviewCard` alleen nog op Overzicht-pad; per-tab een `<TabHeader>` invoegen.
- `CustomerPortalSplash.tsx` — twee kaartjes-kolom vervangen door `JourneyRibbon variant="full"` + één duidelijke "volgende stap" CTA.
- `ProgramStepper.tsx` — verwijderd (of dunne re-export naar `JourneyRibbon` voor backward compat).
- Tab-componenten (`AccommodationSection`, `PracticalView`, `BillingDetailsCard`/`CompactBillingSection`, `AcceptView`) — verwijder eigen koppen waar die nu dubbel komen met `TabHeader`.

## Buiten scope

- Geen wijzigingen aan onderliggende statuslogica, e-mails, DB of edge functions.
- Geen verandering aan de Overzicht-foto-mozaïek.
- Geen wijziging aan mobile bottom-nav (`MobileBottomNav` blijft).

## Open keuze (1 vraag)

Op de Overzicht-pagina: moet de `JourneyRibbon` (full) **bovenaan vóór de welkomsttekst** komen (proces direct centraal), of **na de welkomsttekst** (eerst persoonlijk, dan proces)?  
Default voorstel: **ná de welkomsttekst** — sluit aan op de huidige formele toon ("Welkom, …" eerst, dan "zo verloopt het").
