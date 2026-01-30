
# Plan: Navigatie Anchors + Datum Bewerken Verbeteren

## Geïdentificeerde Problemen

### 1. Navigatie-items werken niet
**Huidige situatie:**
- De `ProgramNavigation` component zoekt naar elementen met id's: `program`, `invoicing`, `details`, `history`
- In `DesktopProgramView` bestaan alleen:
  - `id="program"` (Programma sectie, regel 245)
  - `id="accommodation"` (Logies sectie, regel 223)
  - `id="terms-section"` (Voorwaarden, regel 342)
- De id's `invoicing`, `details`, en `history` ontbreken volledig

### 2. Datum bewerken is niet duidelijk
**Huidige situatie:**
- De datum wordt als platte tekst getoond in `ProgramOverviewCard`
- Geen visuele indicatie dat het klikbaar/bewerkbaar is
- De edit-functie zit verstopt onderaan de pagina in een klein tekst-linkje en een dropdown menu

---

## Oplossing

### A. Navigatie anchors toevoegen

| Navigatie-item | Huidige id | Te koppelen aan |
|----------------|------------|-----------------|
| Programma | `program` | Programma sectie (al correct) |
| Facturatie | `invoicing` | `CompactBillingSection` wrapper |
| Details | `details` | Nieuwe sectie met programma details |
| Geschiedenis | `history` | Geschiedenis sectie |

### B. Datum/groepsgrootte bewerkbaar maken in ProgramOverviewCard

**Visuele aanpassingen:**
- Voeg een kleine "Bewerken" knop toe naast datum en groepsgrootte
- Of: maak de hele datum/groep sectie klikbaar met hover-effect
- Tooltip: "Klik om datum en groepsgrootte aan te passen"

---

## Technische Implementatie

### Stap 1: ProgramOverviewCard aanpassen

Voeg een `onEdit` prop toe en maak de datum/groep sectie klikbaar:

```tsx
interface ProgramOverviewCardProps {
  // ... bestaande props
  onEdit?: () => void;  // Nieuw
}

// In de component:
<div 
  className="grid grid-cols-2 md:grid-cols-4 gap-4 cursor-pointer group" 
  onClick={onEdit}
>
  {/* Datum - met edit indicator */}
  <div className="flex items-center gap-3 relative">
    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <Calendar className="h-4 w-4 text-primary" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">Datum</p>
      <p className="font-medium text-sm truncate">{formatDateRange()}</p>
    </div>
    {onEdit && (
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    )}
  </div>
  
  {/* Groep - met edit indicator */}
  <div className="flex items-center gap-3 relative">
    // ... vergelijkbaar met edit indicator
  </div>
</div>
```

**Alternatief (explicieter):** Voeg een dedicated "Bewerken" knop toe in de header:

```tsx
<div className="flex items-start justify-between gap-4">
  <div className="flex-1">
    <h1>Jouw maatwerkvoorstel</h1>
    // ...
  </div>
  
  {/* Edit button - duidelijk zichtbaar */}
  {onEdit && (
    <Button variant="ghost" size="sm" onClick={onEdit}>
      <Pencil className="h-4 w-4 mr-1" />
      Bewerken
    </Button>
  )}
</div>
```

### Stap 2: DesktopProgramView - Anchors toevoegen

```tsx
{/* Facturatie sectie - id toevoegen */}
<div id="invoicing" className="scroll-mt-20">
  <CompactBillingSection ... />
</div>

{/* Details sectie - nieuwe wrapper */}
<div id="details" className="scroll-mt-20">
  <Card className="border-dashed">
    {/* Programma details, contact, etc. */}
  </Card>
</div>

{/* Geschiedenis - id toevoegen */}
{showHistory && history.length > 0 && (
  <div id="history" className="mt-4 pt-4 border-t scroll-mt-20">
    <ProgramHistoryTimeline ... />
  </div>
)}
```

### Stap 3: Geschiedenis altijd tonen (optioneel)

Omdat de navigatie naar "Geschiedenis" verwijst, moet deze sectie altijd bestaan:

```tsx
{/* History section - altijd renderen, eventueel leeg */}
<div id="history" className="scroll-mt-20">
  {history.length > 0 ? (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Geschiedenis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ProgramHistoryTimeline history={history} variant="embedded" />
      </CardContent>
    </Card>
  ) : (
    <Card className="border-dashed">
      <CardContent className="py-6 text-center text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nog geen geschiedenis</p>
      </CardContent>
    </Card>
  )}
</div>
```

---

## Bestanden te wijzigen

| # | Bestand | Wijziging |
|---|---------|-----------|
| 1 | `src/components/customer-portal/ProgramOverviewCard.tsx` | Voeg `onEdit` prop toe, maak datum/groep sectie klikbaar met visuele feedback |
| 2 | `src/components/customer-portal/DesktopProgramView.tsx` | Voeg ontbrekende id's toe (`invoicing`, `details`, `history`), pass `onEdit` naar ProgramOverviewCard |
| 3 | `src/components/customer-portal/MobileProgramView.tsx` | Zelfde aanpassingen voor mobiele weergave |

---

## Visueel Resultaat

### ProgramOverviewCard na wijziging:

```
┌─────────────────────────────────────────────────────────────┐
│ Jouw maatwerkvoorstel  #REF-2501-0008   [Maatwerk]          │
│                                              [Bewerken] ✏   │ ← Nieuwe knop
│ Dit voorstel is speciaal voor jullie...                     │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌────────────┐            │
│ │ 📅 Datum     │ │ 👥 Groep     │ │ ✨ Type    │            │
│ │ 20 feb 2026 ✏│ │ 20 personen ✏│ │ Akkoord    │            │ ← Hover effect
│ └──────────────┘ └──────────────┘ └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Navigatie na wijziging:
- [Programma] → scrollt naar `#program` (Programma card)
- [Facturatie] → scrollt naar `#invoicing` (Facturatie & Kosten card)
- [Details] → scrollt naar `#details` (Programma details sectie)
- [Geschiedenis] → scrollt naar `#history` (Geschiedenis card)

Edit/ aanvulling om nog nieuwe oplossing te maken: 

Ik denk dat we die navigatie items moeten herovewegen naar wellicht wel andere navigatie items. IK denk dat details en geschiedenis in principe wel weg kunnen en dat we logies moeten toevoegen als dat aan de orde is. 

En zullen we fietsen huren wat prominenter in beeld maken? 

En ik zie niets terug van de voorlopige kosten uit het programma voorstel. Is het niet vriendelijk om die te tonen bij "Facturatie per onderdeel"? 

