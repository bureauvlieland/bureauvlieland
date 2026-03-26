

## Plan: Sorteer projecten op eerstvolgende datum

### Wijziging

**`src/pages/admin/AdminProjects.tsx`** — regel 351:

Huidige sortering:
```typescript
projectList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
```

Nieuwe sortering — eerstvolgende datum bovenaan:
```typescript
projectList.sort((a, b) => {
  const getEarliestDate = (p: Project): Date | null => {
    // Gebruik accommodation_arrival of eerste selected_date
    const candidates: Date[] = [];
    if (p.accommodation_arrival) candidates.push(new Date(p.accommodation_arrival));
    if (p.selected_dates?.length) candidates.push(new Date(p.selected_dates[0]));
    return candidates.length ? new Date(Math.min(...candidates.map(d => d.getTime()))) : null;
  };
  
  const dateA = getEarliestDate(a);
  const dateB = getEarliestDate(b);
  
  // Projecten zonder datum naar achteren
  if (!dateA && !dateB) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  if (!dateA) return 1;
  if (!dateB) return -1;
  
  // Eerstvolgende datum bovenaan (oplopend)
  return dateA.getTime() - dateB.getTime();
});
```

### Resultaat
Projecten met de dichtstbijzijnde aankomst-/startdatum staan bovenaan. Projecten zonder datum zakken naar onder, gesorteerd op aanmaakdatum.

### Bestanden
1. `src/pages/admin/AdminProjects.tsx` — sorteerlogica aanpassen (1 regel → ~15 regels)

