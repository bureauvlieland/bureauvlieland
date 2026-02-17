

## Plan: Tijdlijn-layout voor klantprogramma

### Wat verandert er

Het programma-overzicht in het klantportaal wordt omgebouwd van losse kaarten naar een verticale tijdlijn, vergelijkbaar met de voorbeeldprogramma-pagina. De actieknoppen worden rechts uitgelijnd.

### Visueel ontwerp

```text
  09:00  o----[ Overtocht met Rederij Doeksen          [Zelf te regelen]  [v] ]
              Reguliere veerdienst of Sneldienst
              Dag 1 - 25 sep.  |  1,5 uur
                                          [Verwijderen]

  09:30  o----[ Koffie & Gebak aan boord               [In voorbereiding] [v] ]
              Rederij Doeksen
              Dag 1 - 25 sep.  |  09:30
                                  [Tijd wijzigen]  [Verwijderen]
```

De tijd staat links van de tijdlijn-stip (net als bij ProgramTimeline.tsx), de kaart rechts ervan. Actieknoppen worden rechts uitgelijnd met `ml-auto`.

### Twee wijzigingen

**1. Tijdlijn-wrapper in Desktop/MobileProgramView**

De lijst van `CustomerProgramItem`-kaarten (in zowel `DesktopProgramView.tsx` als `MobileProgramView.tsx`) wordt gewrapped in een tijdlijn-container:
- Een verticale lijn links (`absolute left-[1.15rem] md:left-[4.5rem]`)
- Per item: een tijdkolom links (desktop), een stip op de lijn, en de kaart rechts
- Dit volgt exact het patroon van `ProgramTimeline.tsx`

De bestaande `<div className="space-y-3">` die de items rendert wordt vervangen door een `<div className="relative">` met de verticale lijn en per item een flex-row met tijd + stip + kaart.

**2. Actieknoppen rechts uitlijnen in CustomerProgramItem**

In `CustomerProgramItem.tsx` regel 271 de actierij aanpassen:
- Van: `<div className="mt-3 ml-[76px] flex flex-wrap gap-2">`
- Naar: `<div className="mt-3 ml-[76px] flex flex-wrap gap-2 justify-end">`

De knoppen schuiven hiermee naar rechts.

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/customer-portal/CustomerProgramItem.tsx` | Actieknoppen `justify-end`, thumbnail + ml-[76px] offset verwijderen (tijdlijn vervangt dit) |
| `src/components/customer-portal/DesktopProgramView.tsx` | Tijdlijn-wrapper rond items toevoegen |
| `src/components/customer-portal/MobileProgramView.tsx` | Tijdlijn-wrapper rond items toevoegen |

### Technische details

**Tijdlijn-wrapper** (in beide views, rond de `.map()` van items):

```tsx
<div className="relative">
  {/* Vertical timeline line */}
  <div className="absolute left-[1.15rem] md:left-[4.5rem] top-0 bottom-0 w-px bg-border" />
  
  <div className="space-y-1">
    {dayItems.map((item) => {
      const displayTime = item.confirmed_time || item.proposed_time || item.preferred_time;
      return (
        <div key={item.id} className="relative flex items-start gap-3 md:gap-4 py-2">
          {/* Time column - desktop */}
          <div className="hidden md:flex w-[4rem] shrink-0 justify-end pt-1">
            {displayTime && displayTime !== "flexibel" && (
              <span className="text-sm font-semibold text-primary tabular-nums">
                {displayTime}
              </span>
            )}
          </div>
          {/* Dot */}
          <div className="shrink-0 mt-2">
            <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm" />
          </div>
          {/* Card */}
          <div className="flex-1 min-w-0">
            <CustomerProgramItem ... />
          </div>
        </div>
      );
    })}
  </div>
</div>
```

**CustomerProgramItem aanpassingen:**

- De thumbnail (w-16 h-16) en de `ml-[76px]` offsets worden verwijderd of verkleind, omdat de tijdlijn al visuele structuur geeft
- De tijd wordt niet meer in de meta-rij getoond (staat nu in de tijdlijn-kolom links), alleen op mobiel als fallback
- Actieknoppen krijgen `justify-end` zodat ze rechts uitlijnen
- De kaart zelf wordt borderless of krijgt een subtielere rand voor een schonere tijdlijn-look
