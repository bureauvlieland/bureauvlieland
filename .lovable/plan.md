

# Plan: Volledige stappenweergave altijd zichtbaar maken

## Probleemanalyse

Op dit moment:
- **Mobile**: De `NextStepsCard` toont alle 4 stappen (met waiting/active/completed statussen)
- **Desktop**: Alleen de huidige actieve stap is zichtbaar in de sidebar

Dit maakt het voor klanten onduidelijk wat het volledige proces is en welke stappen nog komen.

## Voorgestelde oplossing

De `NextStepsCard` toevoegen aan de **desktop view** bovenaan de main content, zodat klanten direct het volledige 4-stappenproces zien met visueel onderscheid tussen:

- **Afgeronde stappen**: Groen vinkje, licht gedimde opacity
- **Actieve stap**: Highlighted met border en achtergrondkleur
- **Wachtende stappen**: Grijs/gedimde styling (40% opacity)

## Technische wijzigingen

### 1. DesktopProgramView.tsx aanpassen

De `NextStepsCard` component toevoegen bovenaan de main content area (voor de `AcceptTermsCard`):

```tsx
// Aan het begin van de main content div
<NextStepsCard
  statusSummary={statusSummary}
  termsAccepted={termsAccepted}
  billingComplete={billingComplete}
  onOpenBilling={onOpenBilling}
/>
```

### 2. ProgramSidebar.tsx vereenvoudigen

De `NextStepsCard` uit de sidebar verwijderen (of behouden als compacte samenvatting), omdat de volledige weergave nu in de main content staat.

Optie A: Verwijderen uit sidebar
Optie B: Behouden als "Quick glance" met link naar de volledige weergave

## Visuele weergave van de 4 stappen

De bestaande `NextStepsCard` component heeft al de juiste styling:

| Stap | Status | Visueel |
|------|--------|---------|
| 1. Bevestigingen aanbieders | active/completed | Oranje klok / Groen vinkje |
| 2. Facturatiegegevens invullen | waiting/active/completed | Grijs / Highlighted / Groen |
| 3. Voorwaarden accepteren | waiting/active/completed | Grijs / Highlighted / Groen |
| 4. Boeking compleet | waiting/completed | Grijs / Groen confetti |

## Extra verbetering: "alternative" status toevoegen

Momenteel houdt de logica geen rekening met items die status `alternative` hebben. Deze moeten ook behandeld worden voordat de klant door kan naar stap 3.

Een extra stap of indicator toevoegen wanneer er `alternative` items zijn die klantactie vereisen.

## Impact

- Klanten zien direct het volledige boekingsproces
- Toekomstige stappen zijn zichtbaar maar duidelijk nog niet beschikbaar
- Betere verwachtingsmanagement
- Consistente ervaring tussen mobile en desktop

