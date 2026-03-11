

# Drag-and-drop sortering in ProgramBuilderView

## Huidige situatie

- `ProgramBuilderView` (de klant-configurator) heeft **geen** drag-and-drop — items staan in volgorde van toevoeging.
- `ProgramEditor` (admin) heeft wél drag-and-drop via `@dnd-kit/sortable` + `SortableCartItem`, inclusief `preferredTime`-sortering als fallback.
- `CartContext.reorderItems()` bestaat al en werkt.
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` zijn geïnstalleerd.

## Voorstel: drag-and-drop + automatische tijdsortering

Combinatie van beide methoden:

1. **Automatische sortering op `preferredTime`** — items met een gekozen tijd (bijv. ferry afvaart 09:05) komen automatisch bovenaan, gesorteerd op tijd. Dit is al geïmplementeerd in `ProgramEditor.getItemsForDay()`.

2. **Drag-and-drop** met grip-handle — klanten kunnen items handmatig herordenen. Bij handmatig slepen wordt de tijdsortering voor die dag overschreven (net als de `manualOrder` flag in CartContext).

Dit is precies hoe de admin-editor (`ProgramEditor`) al werkt, dus we hergebruiken dat patroon.

## Wijzigingen

### `ProgramBuilderView.tsx`

- Wrap de dag-items in `DndContext` + `SortableContext` (van `@dnd-kit/sortable`)
- Voeg een `GripVertical` drag-handle toe links van elke kaart
- Sorteer items per dag op `preferredTime` (zelfde logica als `ProgramEditor.getItemsForDay`)
- Voeg `onReorderItems` prop toe, gekoppeld aan `reorderItems` uit CartContext
- `handleDragEnd`: gebruik `arrayMove` om items te herordenen

### `ProgrammaSamenstellen.tsx`

- Geef `reorderItems` door als `onReorderItems` prop aan `ProgramBuilderView`

Geen nieuwe componenten nodig — de bestaande kaart-layout blijft intact, alleen een drag-handle en DnD-wrapper worden toegevoegd.

