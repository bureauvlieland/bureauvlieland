
# Stepper per locatie anders tonen

## Probleem

De `ProgramStepper` staat nu op élke tab boven de hoofdkolom met dezelfde brede horizontale layout. Daardoor lijken alle tabs visueel hetzelfde — alleen de `TabHeader` eronder verschilt, en die valt weg in de visuele zwaarte van de stepper.

## Doel

- **Overzicht-pagina (`CustomerPortalSplash`)** — stepper blijft zoals hij is: groot, horizontaal, twee tracks naast elkaar, als hoofd-visual van het traject.
- **Tab-pagina's (Logies, Programma, Praktisch, Facturatie, Akkoord)** — stepper verhuist naar de **rechterkolom** (sidebar), in een **verticale, compacte** weergave. Boven in de hoofdkolom blijft alleen de tab-eigen `TabHeader` staan, zodat de klant direct ziet waar hij is.

## Aanpak

### 1. `ProgramStepper` krijgt een `variant` prop

```ts
variant?: "horizontal" | "vertical"  // default "horizontal"
```

- `horizontal` (huidig) — twee tracks onder elkaar, mini-stappen horizontaal met connectorlijntjes, gebruikt op Overzicht.
- `vertical` — compacte sidebar-variant:
  - Smallere kaart (past in 320px sidebar-kolom).
  - Per track: titel + lijst van stappen **onder elkaar** (icoon links, label rechts, verticale connectorlijn tussen circles).
  - Statusregel onder elke track blijft, maar compacter (kleinere tekst).
  - CTA-knop full-width onder de statusregel.
  - Geen mobile-collapse-toggle (verticaal is altijd al compact).

Logica voor track-builders (`buildLodgingTrack`, `buildProgramTrack`) en alle props blijven 1-op-1. Alleen `TrackRow` render-helpers krijgen een variant-tak.

### 2. `DesktopProgramView` herindelen

- `ProgramStepper` **verwijderen** uit de hoofdkolom (boven de tab-content).
- `ProgramSidebar` (rechterkolom, 320px) toont bovenaan `<ProgramStepper variant="vertical" />`, daarboven/daaronder de bestaande sidebar-inhoud.
- `TabHeader` blijft bovenaan de hoofdkolom — dat is nu visueel de duidelijke "waar ben ik"-marker.

### 3. `MobileProgramView`

Mobile heeft geen rechterkolom. Twee opties:
- **Voorkeur**: stepper helemaal verbergen op de tab-pagina's mobiel (de `TabHeader` + bottom-nav zijn genoeg), en alleen op een nieuwe sectie/sheet "Voortgang" tonen via een knop in de bottom-nav of header.
- **Alternatief**: stepper boven content laten staan in `variant="vertical"`, ingeklapt achter een "Toon voortgang"-toggle.

Default in dit plan: **alternatief** (verticaal + ingeklapt) — minder ingrijpend, behoudt zichtbaarheid voor wie 'm wil zien.

### 4. `CustomerPortalSplash` — ongewijzigd

Stepper blijft daar `variant="horizontal"` (default), groot in beeld.

### 5. `ProgramSidebar`

Krijgt een nieuwe top-sectie waar de verticale stepper wordt geplaatst, boven de huidige sidebar-content (contact, snel-acties, etc.).

## Bestanden

**Aangepast**
- `src/components/customer-portal/ProgramStepper.tsx` — `variant` prop + verticale render-tak in `TrackRow`/hoofdcomponent.
- `src/components/customer-portal/DesktopProgramView.tsx` — stepper uit hoofdkolom; doorgeven aan `ProgramSidebar`.
- `src/components/customer-portal/ProgramSidebar.tsx` — nieuwe prop `stepperSlot?: ReactNode` (of stepper-props doorgeven), bovenaan tonen.
- `src/components/customer-portal/MobileProgramView.tsx` — stepper omzetten naar `variant="vertical"` + collapsible "Toon voortgang".

**Ongewijzigd**
- `CustomerPortalSplash.tsx` (overzichts-hero).
- `TabHeader.tsx` / `tabHeaderConfig.ts` (al goed per tab).
- Onderliggende statuslogica.

## Buiten scope

- Geen wijziging aan de track-logica zelf (welke stap actief/done is).
- Geen wijziging aan de Overzicht-pagina.
- Geen e-mail / DB / edge-function wijzigingen.

## Open keuze (1 vraag)

**Mobile:** stepper op tab-pagina's verbergen (alleen op Overzicht zichtbaar), of compact-ingeklapt boven de content? Default in dit plan: **compact-ingeklapt boven content**.
