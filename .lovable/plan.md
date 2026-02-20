
# Klantportaal herinrichting: Logies en Programma los van elkaar

## Probleemstelling

Het huidige klantportaal (`/mijn-programma/:token`) toont Logies en Programma in één geïntegreerde view, waardoor het lijkt alsof het één integraal aanbod is. De klant begrijpt niet:
- Dat logies en programma twee losstaande trajecten zijn
- Wie welke factuur stuurt (accommodatieaanbieder vs. Bureau Vlieland vs. individuele partners)
- Hoe het traject in zijn geheel werkt

De gewenste tekst onderaan de pagina verduidelijkt dat het voorstel een werkdocument is: "Onderdelen, aantallen en tijden kunnen we samen verder aanscherpen."

---

## Nieuw paginaontwerp: Splash + twee aparte tabs/secties

### Architectuur: één URL, drie fasen

```text
/mijn-programma/:token
│
├── [SPLASH] Welkomstpagina — altijd als eerste getoond (of bij directe navigatie)
│   ├── Uitleg hoe het traject werkt (stappenoverzicht)
│   ├── Duidelijk: Logies en Programma zijn losse trajecten
│   ├── Duidelijk: wie factureert wat
│   └── CTA: "Bekijk uw logies" + "Bekijk uw programma"
│
├── [TAB: Logies] — AccommodationSection (huidig)
│   └── Offertes vergelijken, kiezen
│
└── [TAB: Programma] — DesktopProgramView / MobileProgramView (huidig)
    └── Activiteiten, facturatie, voorwaarden
```

De splash wordt getoond als "eerste bezoek" (via localStorage-flag per token), daarna kunnen klanten vrij navigeren tussen de tabs. Een vaste top-navigatiebalk toont altijd de tabs en de huidige status van elk onderdeel.

---

## Gedetailleerde inhoud van de splash

### Blok 1: Welkomstboodschap
- Naam klant/bedrijf + kenmerk
- Intro: "Fijn dat u er bent. Via dit portaal kunt u uw verblijf op Vlieland samenstellen en goedkeuren."
- **Werkdocument-disclaimer** prominent zichtbaar:
  > "Dit voorstel is bedoeld als werkdocument. Onderdelen, aantallen en tijden kunnen we samen verder aanscherpen. Na afstemming kunnen we het voorstel definitief maken."

### Blok 2: Hoe werkt het traject?
Visuele stappenlijn (3-4 stappen):

```text
1. Logies regelen        2. Programma samenstellen    3. Akkoord geven        4. Klaar!
   Offertes vergelijken     Activiteiten bekijken         Facturatiegeg. invullen   Bevestiging
   & keuze maken            & goedkeuren                  & ondertekenen
```

### Blok 3: Logies en Programma zijn los
Twee kaarten naast elkaar:

```text
┌─────────────────────────────┐  ┌──────────────────────────────┐
│  🏨 Logies                  │  │  📅 Programma                │
│                             │  │                              │
│  Rechtstreeks geboekt bij   │  │  Bureau Vlieland coördineert │
│  de accommodatieaanbieder.  │  │  de activiteiten.            │
│                             │  │                              │
│  Factuur van: Aanbieder     │  │  Factuur van: Bureau Vlieland│
│                             │  │  + individuele aanbieders    │
│  [Status badge]             │  │  [Status badge]              │
│  [Bekijk logies →]          │  │  [Bekijk programma →]        │
└─────────────────────────────┘  └──────────────────────────────┘
```

### Blok 4: Contact
- "Vragen? Neem contact op met Bureau Vlieland"
- E-mailadres + telefoonnummer

---

## Navigatie: vaste tabbar bovenaan

Na de splash navigeert de klant via een sticky tabbar:

```text
[← Overzicht]  [🏨 Logies · status-badge]  [📅 Programma · status-badge]  [📋 Facturatie]
```

Status badges: "Kies uw logies" / "In behandeling" / "✓ Gekozen" etc.

De bestaande `ProgramNavigation`-component wordt uitgebreid met een "Overzicht" tab die teruglinkt naar de splash.

---

## Technische aanpak

### Nieuwe component: `CustomerPortalSplash.tsx`
Volledig nieuwe component met de welkomstcontent, stappenoverzicht en de twee kaarten (logies / programma). Ontvangt als props:
- `program` — voor naam, bedrijf, kenmerk
- `accommodation` + `accommodationQuotes` — voor logies-status badge
- `statusSummary` — voor programma-status badge
- `selectedDates`, `numberOfPeople`
- `onNavigate(tab: "accommodation" | "program")` — navigeert naar de juiste tab

### Aanpassing `CustomerProgram.tsx`
- Nieuwe state: `activeView: "splash" | "accommodation" | "program"` (default: "splash")
- Eerste keer bezoek: sla `bv_portal_visited_${token}` op in localStorage → daarna direct naar main view
- De splash toont altijd als er nog geen logies-keuze gemaakt is en het een meerdaags programma betreft

### Aanpassing navigatie
`ProgramNavigation` krijgt een "Overzicht" tab links, plus de bestaande tabs worden duidelijker gelabeld met status.

### `DesktopProgramView` / `MobileProgramView`
- De AccommodationSection wordt **verwijderd** uit de programmaview als `activeView` wordt gebruikt — logies is nu een eigen tab
- Als `activeView === "accommodation"` → alleen `AccommodationSection` tonen (in een eigen wrapper zonder het programma erbij)
- Als `activeView === "program"` → huidig programma zonder logies-sectie

### Facturatie-uitleg verplaatsen
De `InvoiceProvidersCard` krijgt een prominentere plek in de splash (uitleg per blok) én blijft in de facturatietab. De tekst wordt aangescherpt:
- Logies: "Factuur ontvang je rechtstreeks van [naam accommodatie]"
- Programma: "Bureau Vlieland factureert de coördinatie en eigen onderdelen; aanbieders factureren hun activiteiten rechtstreeks"

---

## Bestanden die worden aangemaakt / gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `src/components/customer-portal/CustomerPortalSplash.tsx` | **Nieuw** — splash/welkomstpagina component |
| `src/pages/CustomerProgram.tsx` | State voor `activeView`, localStorage-check, renderen splash vs. tabs |
| `src/components/customer-portal/ProgramNavigation.tsx` | "Overzicht" tab toevoegen + status-badges per tab |
| `src/components/customer-portal/DesktopProgramView.tsx` | AccommodationSection conditioneel renderen (prop `showAccommodation`) |
| `src/components/customer-portal/MobileProgramView.tsx` | Idem |

Geen database-wijzigingen nodig. Geen nieuwe routes nodig (alles binnen `/mijn-programma/:token`).

---

## Openstaande afstemmpunten

1. **Altijd splash tonen bij eerste bezoek**, of alleen als logies nog niet gekozen is?
2. **Programma zonder logies**: bij eendaagse programma's is er geen accommodatie — splash vereenvoudigt dan tot alleen stap 2+3. Tonen we de splash ook voor eendaagse programma's?
3. **Werkdocument-disclaimer**: moet deze bij elk bezoek zichtbaar zijn (bijv. bovenaan de tabs), of alleen op de splash?
4. **Facturatietab**: blijft de facturatie onderdeel van de programmatab, of wordt het een volledig aparte derde tab?
