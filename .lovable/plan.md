

## Plan: Partner Dashboard — oude/irrelevante items opschonen

### Analyse
De edge function `get-partner-dashboard` laadt **alle items ooit** toegewezen aan een partner, zonder enige datumfiltering. Dit betekent:

1. **Items van geannuleerde projecten**: Worden correct op `cancelled` gezet door `cancel-program-request`, maar blijven in de respons staan (bewust, zodat partners annuleringen zien)
2. **Oude afgeronde items**: Items van maanden/jaren geleden (gefactureerd, geannuleerd) blijven eindeloos getoond
3. **Potentieel stale items**: Als een project op een andere manier wordt geannuleerd (bijv. admin zet handmatig status), worden items mogelijk NIET op `cancelled` gezet

### Wijzigingen

**1. `supabase/functions/get-partner-dashboard/index.ts`** — Datumfilter toevoegen

Items beperken tot:
- Activiteiten waarvan het project `selected_dates` bevat die **niet ouder zijn dan 6 maanden** geleden, OF
- Items met status `pending`, `confirmed`, `alternative`, `counter_proposed`, `accepted`, `executed` (altijd tonen, ongeacht datum — deze vergen actie)
- Geannuleerde/gefactureerde items alleen tonen als ze **< 3 maanden oud** zijn

Concreet: een filter toevoegen na het ophalen van items:
```typescript
const cutoffDate = new Date();
cutoffDate.setMonth(cutoffDate.getMonth() - 3);

const activeItems = (items || []).filter(item => {
  // Altijd tonen: items die actie vereisen
  const activeStatuses = ["pending", "confirmed", "alternative", "counter_proposed", "accepted", "executed"];
  if (activeStatuses.includes(item.status)) return true;
  
  // Afgeronde/geannuleerde items: alleen recente tonen
  return new Date(item.updated_at) > cutoffDate;
});
```

**2. `supabase/functions/get-partner-dashboard/index.ts`** — Zelfde filter voor accommodation quotes

Afgewezen/verlopen logiesoffertes verbergen als ze ouder dan 3 maanden zijn.

### Resultaat
- Partner dashboard toont alleen relevante items
- Oude geannuleerde/gefactureerde items verdwijnen automatisch na 3 maanden
- Items die nog actie vereisen worden altijd getoond ongeacht leeftijd
- Geen database-wijzigingen nodig

### Bestanden
1. `supabase/functions/get-partner-dashboard/index.ts` — datumfilter voor items en accommodation quotes

