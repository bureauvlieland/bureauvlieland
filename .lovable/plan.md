## Doel

Op de Werkbank (`/admin/werkbank`) moeten openstaande, automatisch aangemaakte acties (`admin_todos` met `auto_type`) zichzelf actualiseren — niet alleen voor facturatie/betalingen, maar voor álle auto-types. Dit gebeurt:

1. **Automatisch** bij het openen van de Werkbank en daarna iedere 5 minuten zolang de pagina open is.
2. **Handmatig** via een nieuwe knop "Actualiseer" in de header naast het Claudia-icoon.

## Aanpak

### 1. Edge function `reconcile-admin-todos`

Eén nieuwe functie die per openstaande todo (`status in ('todo','in_progress')`) controleert of het anker nog actueel is. Indien resolved → `status='done'`, `completed_at=now()`. Daarna roept dezelfde functie `check-pending-items` aan voor het aanmaken/bijwerken van nieuwe todos.

Resolutieregels per `auto_type`:

| auto_type | Sluit als… |
|---|---|
| `post_execution_invoice_check` | `bureau_invoices` voor `related_request_id` bestaat |
| `post_execution_feedback` | item heeft `feedback_collected_at` of project `completion_status='fully_invoiced'` |
| `purchase_invoice_pending`, `purchase_invoice_inbox` | bijbehorende `partner_purchase_invoices.status in ('paid','rejected','archived')` of inbox-item afgehandeld |
| `commission_pending` | gekoppelde `payment_batches.status='paid'` |
| `invoicing_ready` | request `completion_status='fully_invoiced'` |
| `quote_pending_partner` | quote-status ≠ `pending` |
| `quote_pending_customer` | request `customer_approved_at` is gezet of quote-status afgerond |
| `quote_expiring_soon`, `quote_expired_partner` | quote-status afgerond/afgewezen |
| `request_no_response` | partner heeft gereageerd (item.status ≠ pending) |
| `send_items_to_partners` | hergebruik bestaande `ensureSendItemsTodo`-logica (geen items meer ready) |
| `all_partners_responded` | reeds afgehandelde aanvraag |
| `customer_status_update_due`, `customer_status_email_due` | request `customer_status_last_sent_at` recent (< drempel) |
| `customer_inputs_missing` | request heeft vereiste velden (people/dates) |
| `customer_date_change_partner_notify` | alle partners genotificeerd of items niet meer pending |
| `customer_cancellation` | project `status='cancelled'` afgehandeld of todo > 7 dagen oud |
| `book_ferry_tickets` | ticket-item heeft `booking_reference` |
| `new_request_received`, `new_program_request`, `new_accommodation_request` | request niet meer `status='new'` (in behandeling) |
| `partner_status_update`, `partner_reminder` | gekoppeld item/quote afgerond |
| `inbound_email` | bijbehorende e-mail `handled_at` is gezet |
| `stale_pending_change` | item heeft geen pending wijziging meer |

Algemeen: als `related_request_id` verwijst naar een verwijderd of geannuleerd project → sluiten. Idempotent en service-role.

### 2. UI op `AdminWerkbank.tsx`

- "Actualiseer"-knop (icon `RefreshCw`) in de header, links van Claudia.
- On click: invoke `reconcile-admin-todos` → toast met `{closed, created, updated}` → invalidate queries `["werkbank-projects"]`, `["admin-todos"]`, `["admin-todo-count"]`, `["claudia-recommendations-count"]`, `["inbox"]`.
- `useEffect` met `setInterval(5 * 60_000)` die stilletjes hetzelfde aanroept (zonder toast).
- Eerste call ook bij mount (achter een `useRef`-guard zodat dev-strict-mode niet dubbelt).

### 3. Hook

`src/hooks/useReconcileTodos.ts` — wrapper rond `supabase.functions.invoke('reconcile-admin-todos')` met `useMutation`, terugkerende stats en automatische invalidations.

## Buiten scope

- Geen heropenen van eerder afgeronde todos.
- Geen aanpassingen aan `check-pending-items` zelf (alleen hergebruiken vanuit de nieuwe functie).
- Geen wijziging aan de bestaande cron-schedules.

## Technische details

- Nieuwe bestanden: `supabase/functions/reconcile-admin-todos/index.ts`, `src/hooks/useReconcileTodos.ts`.
- Edit: `src/pages/admin/AdminWerkbank.tsx` (knop + interval).
- Edge function uses service role en logt totals in `console.log` voor edge function logs.
- Run-tijd target: < 3 s bij ≤ 200 openstaande todos (batch reads per type).
