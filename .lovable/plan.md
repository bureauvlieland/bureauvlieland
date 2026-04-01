

## Plan: Logiesoverzicht sorteren op aankomstdatum

### Huidige situatie
Het overzicht wordt gesorteerd op `created_at` (aanmaakdatum, nieuwste eerst).

### Wijziging
In `src/pages/admin/AdminAccommodation.tsx` de `.order()` aanpassen van `created_at DESC` naar `arrival_date ASC` — eerste aankomstdatum bovenaan, oplopend naar beneden.

| Bestand | Actie |
|---|---|
| `src/pages/admin/AdminAccommodation.tsx` | `.order("arrival_date", { ascending: true })` i.p.v. `created_at DESC` |

Eén regel wijzigen.

