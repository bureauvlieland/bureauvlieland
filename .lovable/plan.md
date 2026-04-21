

## Plan: scherpere header-foto op `/bouwstenen`

### Diagnose
De huidige hero op `/bouwstenen` gebruikt `src/assets/dunes-group.jpg` (de groep met handen in de lucht). De foto is uitgesneden/uitgerekt en oogt niet scherp op grote viewports.

### Fix
Vervang de hero-import in `src/pages/Bouwstenen.tsx` door een scherpere, breed-formaat foto uit de bestaande assets.

**Voorkeur**: `vlieland-landscape.jpg` — een landschapsbeeld dat goed schaalt op 2654px breed en past bij "alle bouwstenen" (neutraal, eilandsfeer, niet één activiteit).

**Alternatieven** (één keuze):
- `cycling-group.jpg` — toont activiteit/groep, energieker
- `beach-event.jpg` — strandevent, sfeervol bij avond
- `team-beach.jpg` — groep op strand

### Wijziging
In `src/pages/Bouwstenen.tsx`, regel 23:
```tsx
import heroImage from "@/assets/vlieland-landscape.jpg";
```

Geen andere wijzigingen — de Ken Burns + gradient-overlay blijven gelijk.

### Niet in scope
- `/partners` header (gebruiker noemde alleen bouwstenen-header).
- Nieuwe foto uploaden — wordt bestaande asset.

### Vraag
Voorkeur voor `vlieland-landscape.jpg` (landschap) of liever `cycling-group.jpg` / `beach-event.jpg` / `team-beach.jpg`? Standaard pak ik `vlieland-landscape.jpg`.

