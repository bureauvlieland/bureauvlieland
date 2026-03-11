

# Klantportaal: programma zichtbaar maken + sidebar banners vervangen

## Twee problemen

### 1. Programma-items niet zichtbaar
In `DesktopProgramView.tsx` (regel 343) staat een check `!program.program_published_at` — als admin het programma nog niet heeft "gepubliceerd", toont het een lege state ("Bureau Vlieland is uw programma aan het samenstellen"). De 13 items bestaan wel, maar worden verborgen.

**Oplossing**: Verwijder de `program_published_at` check als er daadwerkelijk items zijn. Als er items bestaan, toon ze gewoon — ze hebben al de juiste status (pending). De lege-state alleen tonen als er ook echt geen items zijn.

Dezelfde check zit in `MobileProgramView.tsx` — daar ook aanpassen.

### 2. Sidebar banners vervangen
`FietsverhuurBanner` en `BootticketBanner` worden verwijderd uit `ProgramSidebar`. In de plaats komen twee horeca-advertenties:

- **Trattoria Oliva** — `https://olivavlieland.nl` — met `outdoor-dining.jpg`
- **Café Boven** — `https://cafeboven.nl` — met `outdoor-drinks.jpg`

Zelfde sidebar-stijl als de bestaande banners (afbeelding + tekst + link).

## Wijzigingen

| Bestand | Actie |
|---------|-------|
| `DesktopProgramView.tsx` | Regel 343: check wijzigen naar `items.length === 0` i.p.v. `!program_published_at` |
| `MobileProgramView.tsx` | Zelfde check aanpassen |
| `ProgramSidebar.tsx` | FietsverhuurBanner/BootticketBanner vervangen door twee horeca-links |

Geen nieuw component nodig — de banners zijn simpel genoeg om inline in `ProgramSidebar` te zetten met dezelfde stijl als de bestaande sidebar-variant.

