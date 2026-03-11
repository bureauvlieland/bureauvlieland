

# Bug: Partner ziet items die nog niet verstuurd zijn

## Probleem
De edge function `get-partner-dashboard` haalt alle items op voor een partner (gefilterd op `provider_id`), maar controleert **niet** of `skip_partner_notification` nog op `true` staat. Daardoor zien partners items in hun portaal die de admin nog niet heeft verstuurd.

In de admin staat terecht "11 onderdelen zijn nog niet naar partners verstuurd", maar de partner ziet ze al wél.

## Oplossing

### 1. `supabase/functions/get-partner-dashboard/index.ts`
Filter toevoegen aan de query op regel 76:
```typescript
.eq("provider_id", partner.id)
.neq("block_type", "self_arranged")
.or("skip_partner_notification.is.null,skip_partner_notification.eq.false")  // ← toevoegen
```

Dit zorgt ervoor dat items met `skip_partner_notification = true` niet meer zichtbaar zijn voor partners totdat de admin ze vrijgeeft.

### 2. Dezelfde filter toevoegen aan de sibling-items query (regel ~97-100)
De query die gerelateerde items ophaalt (voor context in het partnerportaal) hoeft geen extra filter — die toont alleen items van hetzelfde programma en bevat geen acties. Maar voor consistentie kan dezelfde filter worden toegepast.

### Bestanden
- `supabase/functions/get-partner-dashboard/index.ts`

