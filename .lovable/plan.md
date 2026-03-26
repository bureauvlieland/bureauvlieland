

## Plan: Readiness-indicator per project

### Idee
Een compacte **voortgangsbalk + percentage** in een nieuwe kolom "Gereed" die in één oogopslag toont hoe ver elk project is. Geen extra klikken nodig.

### Berekening per project
De readiness wordt bepaald door max. 4 checkpunten (afhankelijk van projecttype):

| Checkpoint | Conditie "klaar" | Van toepassing |
|---|---|---|
| Items verstuurd naar partners | `items_not_sent === 0` en `item_count > 0` | Als `program_id` bestaat |
| Partners bevestigd | `items_confirmed === item_count` (non-cancelled) | Als `program_id` bestaat |
| Logies geregeld | Een quote heeft status `selected` | Als `accommodation_id` bestaat |
| Voorwaarden getekend | `terms_accepted_at !== null` | Altijd (behalve concept/geannuleerd) |

**Score** = (afgevinkte checkpoints / totaal relevante checkpoints) × 100%

- `concept` of `geannuleerd` → geen balkje tonen (dash of n.v.t.)
- 100% → groene balk + ✓
- 50-99% → amber balk
- 0-49% → rode/grijze balk

### Weergave
Een smalle kolom "Gereed" met:
- Kleine `<Progress />` balk (h-1.5, ~60px breed)
- Percentage ernaast in `text-xs` (bijv. "75%")
- Bij 100%: groen vinkje in plaats van percentage

### Wijzigingen

**`src/pages/admin/AdminProjects.tsx`**:
1. Voeg `getReadinessScore(project): { score: number, total: number, percentage: number }` helper toe
2. Voeg kolom "Gereed" toe aan `TableHeader` (tussen "Status" en "Referentie(s)")
3. Voeg `TableCell` toe met `<Progress />` + percentage
4. Import `Progress` uit `@/components/ui/progress`

### Bestanden
1. `src/pages/admin/AdminProjects.tsx`

