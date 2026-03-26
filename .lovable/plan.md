

## Plan: Bulk opschoonfunctie voor verouderde auto-taken

### Probleem
Bestaande auto-taken die niet meer relevant zijn (bijv. "partner heeft niet gereageerd" terwijl het project al afgerond of geannuleerd is) blijven open staan. De prospectieve auto-resolve logica ruimt alleen toekomstige wijzigingen op.

### Oplossing
Een edge function `cleanup-stale-todos` die in bulk alle verouderde auto-taken op "done" zet, plus een knop in het Operationeel Centrum om deze te triggeren.

### Opschoningsregels

| Situatie | Actie |
|----------|-------|
| Project geannuleerd (`cancelled_at IS NOT NULL`) | Alle open todos met dat `related_request_id` → done |
| Project afgerond (`completion_status = 'completed'`) | Alle open todos met dat `related_request_id` → done |
| `quote_pending_partner` maar quote is niet meer `pending` | → done |
| `quote_review` maar quote is niet meer `submitted` | → done |
| `forward_accommodation_quote` maar quote al `forwarded_at` heeft | → done |
| `quote_ready_to_send` maar offerte al verstuurd (`quote_sent_at`) | → done |
| `send_items_to_partners` maar items al verstuurd (geen `pending` items meer) | → done |
| `accommodation_selected` maar quote al `selected` status heeft | → done |
| Todo's waarvan `auto_entity_id` verwijst naar een niet-bestaand record | → done |

### Implementatie

**1. Nieuwe edge function: `supabase/functions/cleanup-stale-todos/index.ts`**
- Service-role Supabase client
- Admin-only (JWT check)
- Voert bovenstaande regels uit als SQL queries
- Retourneert teller van opgeruimde taken per categorie

**2. UI: knop in `src/pages/admin/AdminTodos.tsx`**
- "Opschonen" knop met bezem-icoon naast de bestaande knoppen
- Confirmation dialog: "Dit ruimt alle taken op die niet meer relevant zijn (afgeronde/geannuleerde projecten, verwerkte offertes). Doorgaan?"
- Na succes: toast met aantal opgeruimde taken + query invalidatie

**3. Optioneel later: `resolveAllTodosForRequest()` helper in `autoTodoCreator.ts`**
- Client-side helper voor directe resolve bij annulering vanuit de UI

### Bestanden
1. `supabase/functions/cleanup-stale-todos/index.ts` — nieuwe edge function
2. `src/pages/admin/AdminTodos.tsx` — opschoonknop + dialog

### Geen database-wijzigingen nodig

