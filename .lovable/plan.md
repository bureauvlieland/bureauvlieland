

## Plan: Fix telling + compactere takenlijst

### Probleem 1: Telling klopt niet (9 vs 8 zichtbaar)
De lijst-weergave groepeert op `auto_type` en itereert over `groupOrder` (handmatig + alle keys uit `autoTodoTypeConfig`). Als een todo een `auto_type` heeft die NIET in `autoTodoTypeConfig` staat, wordt die WEL meegeteld in de header maar NIET gerenderd. Oplossing: onbekende auto_types als fallback bij de groep "Overige" plaatsen.

### Probleem 2: Layout te ruim
Elke taak-item heeft `p-4` padding, volledige beschrijving, grote badges, en veel verticale ruimte. Compacter maken door:
- Padding reduceren naar `p-2.5` of `py-2 px-3`
- Beschrijving op 1 regel (al `line-clamp-2`, wordt `line-clamp-1`)
- Prioriteit-badge kleiner (alleen icoon + kleur-dot, geen tekst)
- Meta-info (datum, partner, project) op dezelfde regel als de titel waar mogelijk
- Action button en menu dichter bij de content

### Wijzigingen

**`src/pages/admin/AdminTodos.tsx`**:

1. **Fix groepering**: Na het groeperen op `auto_type`, voeg een "overige" fallback-groep toe voor types die niet in `groupOrder` zitten. Of beter: verzamel alle keys die in `groupedTodos` bestaan maar niet in `groupOrder` en voeg ze toe.

2. **Compactere `renderTodoItem`**:
   - `p-4` → `py-2 px-3`
   - Priority badge: alleen gekleurde dot + icoon, geen tekst-label
   - Auto-type badge: kleiner (`text-[10px]`)
   - Beschrijving: `line-clamp-1` of verberg in compacte modus
   - Verwijder `mt-2` van meta-rij, maak `mt-1`
   - Alles op minder regels

3. **Compactere groep-headers**: `CardHeader` padding reduceren

### Bestanden
1. `src/pages/admin/AdminTodos.tsx` — fix groepering + compact layout

