
## Plan: Sync-dialoog echt scrollbaar maken

### Wat er nu misgaat
De teller met `Synchroniseer 7 onderdelen` klopt waarschijnlijk gewoon: er zijn 7 items met verschillen. Je ziet er maar 4 omdat de lijst in de dialoog wordt afgeknipt.

De oorzaak zit in de combinatie van:
- `DialogContent` met alleen een `max-h`
- `ScrollArea` met `max-h-[50vh]`
- Radix `ScrollArea.Viewport` met `h-full`

Daardoor krijgt de viewport geen echte vaste hoogte, maar wordt de inhoud wel verborgen. Resultaat: onderste kaarten verdwijnen uit beeld zonder bruikbare scroll.

### Meest logische oplossing
De lijst in deze dialoog niet via de huidige `ScrollArea` laten lopen, maar via een normale scroll-container binnen een vaste dialog-layout. Dat past ook beter bij de rest van de codebase, waar dialogen vaak `overflow-y-auto` gebruiken.

### Wijzigingen

**1. `src/components/admin/SyncBuildingBlocksDialog.tsx`**
- Maak de dialog-layout expliciet:
  - `DialogContent` met `max-h-[85vh] flex flex-col overflow-hidden`
  - header / filters / footer als `shrink-0`
  - middendeel als `min-h-0 flex-1`
- Vervang de huidige `ScrollArea` rond de diff-lijst door een gewone container zoals:
  - `div className="min-h-0 flex-1 overflow-y-auto pr-2"`
- Laat de lijst daarin renderen, zodat alle 7 onderdelen bereikbaar zijn
- Eventueel kleine extra UX-fix:
  - lijst iets naar buiten laten lopen met `-mx-1 px-1` zodat scrollbar niet tegen de card-content drukt

**2. Optionele cleanup**
- Als `ScrollArea` daarna nergens nuttig voor is in deze dialoog: import verwijderen
- Knoptekst laten zoals die is; die lijkt nu juist de volledige set te tellen

### Verwacht resultaat
- Alle 7 bouwstenen blijven in dezelfde dialoog zichtbaar via verticale scroll
- Footer met “Annuleren / Synchroniseer …” blijft netjes onderin staan
- Geen afgekapt overzicht meer
- Geen backend-wijzigingen nodig

### Bestanden
1. `src/components/admin/SyncBuildingBlocksDialog.tsx`

### Technische noot
Als we per se `ScrollArea` willen behouden, moet de hele hoogteketen expliciet gemaakt worden (`h-full`/vaste hoogte op parent wrappers). Maar voor deze dialoog is `overflow-y-auto` eenvoudiger, robuuster en consistenter met bestaande patronen in het project.
