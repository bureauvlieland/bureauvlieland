

# Plan: Template "Avontuur & Ontspanning" vullen + 4 bugfixes in template-editor

## 1. Template "Avontuur & Ontspanning" invullen (database)

Twee dagen vol avontuur en ontspanning op Vlieland:

**Dag 1 -- Avontuur**
| Tijd  | Activiteit |
|-------|-----------|
| 09:00 | Overtocht met Rederij Doeksen (`boot-retour`) |
| 10:45 | Fietshuur (`fiets-huur`) |
| 11:00 | RescueBoat Transfer (`rescueboat`) |
| 12:30 | Lunch in de natuur (`lunch-strand`) |
| 14:00 | Branding Raften (`voc-branding-raften`) |
| 16:30 | Borrel & Hapjes (`borrel`) |
| 18:30 | Strand BBQ (`strand-bbq`) |

**Dag 2 -- Ontspanning**
| Tijd  | Activiteit |
|-------|-----------|
| 09:30 | Fietstocht met begeleiding (`fietstocht-met-begeleiding`) |
| 11:30 | Zeehondentocht (`zeehondentocht`) |
| 13:00 | Luncharrangement (`luncharrangement`) |
| 14:30 | Vuurtorenbezoek (`vuurtoren`) |
| 16:00 | Rondleiding Brouwerij Fortuna (`rondleiding-brouwerij-fortuna`) |
| 17:30 | Overtocht retour (`boot-retour`) |

Na het invoegen wordt de template gepubliceerd (`is_published = true`).

## 2. Drag-and-drop voor items (AdminTemplateSheet.tsx)

Momenteel toont de GripVertical-icoon puur visueel maar er zit geen dnd-kit logica achter. Oplossing:
- `@dnd-kit/core` en `@dnd-kit/sortable` importeren (al geinstalleerd)
- De itemlijst per dag wrappen in `DndContext` + `SortableContext`
- Elk item-row een `useSortable` hook geven
- Bij `onDragEnd`: de `sort_order` van de betrokken items updaten in de database via `useUpdateTemplateItem`

## 3. Sorteren op tijd (AdminTemplateSheet.tsx)

Items worden nu gesorteerd op `sort_order`. Wijzigen naar sortering op `preferred_time` (als fallback op `sort_order`):
```typescript
.sort((a, b) => {
  if (a.preferred_time && b.preferred_time) {
    return a.preferred_time.localeCompare(b.preferred_time);
  }
  return (a.sort_order || 0) - (b.sort_order || 0);
})
```

## 4. Bouwstenen meerdere keren toestaan (AddTemplateItemDialog.tsx)

De huidige code blokkeert bouwstenen die al in de template zitten (`existingBlockIds` check). Oplossing:
- De `existingBlockIds` prop en de `isAlreadyInTemplate`-check verwijderen
- Alle actieve bouwstenen altijd selecteerbaar maken
- Prop verwijderen uit `AdminTemplateSheet.tsx` regel 576

## 5. Tijd instellen op 5 minuten nauwkeurig (AddTemplateItemDialog.tsx)

De HTML `<input type="time">` heeft standaard 1-minuut stappen. Oplossing:
- `step="300"` attribuut toevoegen (300 seconden = 5 minuten)
- Dit geldt voor zowel de AddTemplateItemDialog als eventuele andere tijdinputs

## Technisch overzicht

**Bestanden:**
- `src/components/admin/AdminTemplateSheet.tsx` -- drag-and-drop toevoegen, tijdsortering, `existingBlockIds` prop verwijderen
- `src/components/admin/AddTemplateItemDialog.tsx` -- duplicate-check verwijderen, `step="300"` op time input
- Database: INSERT items voor avontuur-ontspanning template + UPDATE publish status

**Dependencies:** Geen nieuwe -- `@dnd-kit/core` en `@dnd-kit/sortable` zijn al geinstalleerd.

