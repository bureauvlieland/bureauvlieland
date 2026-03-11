

# "Overzicht en versturen" — review-stap voor verzending

## Huidige flow
Klik "Verstuur aanvraag" → Dialog met samenvatting + contactformulier in één → Succes-scherm met link naar klantportaal.

**Problemen:** De samenvatting is compact en niet gegroepeerd per dag. Het proces wordt pas in de modal uitgelegd. Na succes moet de gebruiker zelf op een link klikken.

## Nieuwe flow

**Knop wordt "Overzicht en versturen"** → Opent een **full-width Sheet (van rechts)** met drie secties:

### 1. Programmaoverzicht (per dag)
- Alle activiteiten gegroepeerd per dag, met naam, categorie, duur en eventuele gekozen afvaarttijd
- Vergelijkbaar met de builder-weergave maar read-only (geen drag, geen delete)
- Aantal personen en datum(s) bovenaan

### 2. Zo werkt het (procesuitleg)
- Hergebruik van de bestaande `HowItWorksBlock` component (5 stappen: samenstellen → beschikbaarheid → voorstel → bevestigen → coördinatie)
- Maakt duidelijk dat dit vrijblijvend is en dat er nog niets betaald wordt

### 3. Contactgegevens + verzenden
- Bestaande formuliervelden (naam, email, telefoon, bedrijf, type uitje, opmerkingen)
- Verzendknop

### Na succesvolle verzending
- Automatische redirect naar `/mijn-programma/{token}` (klantportaal) na 2 seconden
- Kort succes-bericht met countdown

## Technische aanpak

### `RequestFormModal.tsx` → `ReviewAndSubmitSheet.tsx`
- Vervang de `Dialog` door een `Sheet` (side="right", brede variant ~lg)
- Voeg het dagprogramma-overzicht toe bovenaan
- Integreer `HowItWorksBlock`
- Behoud formulier en submit-logica
- Na succes: `useNavigate()` redirect naar klantportaal

### `ProgramBuilderView.tsx`
- Hernoem knoptekst naar "Overzicht en versturen"
- Icoon van `Send` → `ArrowRight` of `ClipboardCheck`

### `ProgrammaSamenstellen.tsx`
- Pas import en component-naam aan

### `HowItWorksBlock.tsx`
- Voeg optionele `compact` prop toe zodat het in de sheet past (kleinere spacing)

