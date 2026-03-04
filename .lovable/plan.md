

## Plan: Items automatisch op "bevestigd" zetten bij versturen offerte

### Probleem

Wanneer een admin een offerte verstuurt, behouden items hun `item_quote_status` van `concept`. Daardoor ziet de klant "In voorbereiding" en kan niet per item of in bulk akkoord geven. De per-item "Akkoord"-knop en de bulk "Alle resterende akkoord geven"-knop zijn al gebouwd en werken correct -- ze worden alleen nooit zichtbaar omdat items nooit op `bevestigd` komen.

### Oplossing

Een kleine wijziging in `send-quote-offer`: na het updaten van de `program_requests` status naar `offerte_verstuurd`, ook alle actieve items met `item_quote_status` `concept` of `in_afstemming` automatisch op `bevestigd` zetten.

### Wat er wijzigt

**1 bestand: `supabase/functions/send-quote-offer/index.ts`**

Na de bestaande program_requests update (rond regel 270-277) wordt toegevoegd:

```typescript
// Auto-set active items to "bevestigd" so customer can approve them
const { error: itemsUpdateError } = await supabase
  .from("program_request_items")
  .update({ item_quote_status: "bevestigd" })
  .eq("request_id", requestId)
  .neq("status", "cancelled")
  .in("item_quote_status", ["concept", "in_afstemming"]);

if (itemsUpdateError) {
  console.error("Error updating item quote statuses:", itemsUpdateError);
}
```

### Wat al werkt en ongewijzigd blijft

- Per-item "Akkoord"-knop in `CustomerProgramItem.tsx` (verschijnt bij `item_quote_status === "bevestigd"` en geen `customer_approved_at`)
- Bulk "Alle resterende akkoord geven" in `ProgramIntroCard.tsx`
- `approve-quote-item` edge function (per-item akkoord, stuurt partner notificatie)
- `accept-quote-proposal` edge function (bulk akkoord, stuurt alle partner notificaties, slaat reeds goedgekeurde items over)
- Definitief per-item akkoord na partner-reactie (bestaande confirmed/alternative flow)

### Resulterende flow

```text
Admin stelt programma samen (items op "concept")
         |
Admin verstuurt offerte
 -> quote_status = "offerte_verstuurd"
 -> items automatisch naar item_quote_status = "bevestigd"
         |
Klant ziet programma met "Akkoord"-knoppen per item
 + bulk "Alle resterende akkoord geven"
         |
Klant geeft per item of in bulk akkoord
 -> partners worden per item ingelicht
 -> quote_status wordt "akkoord_ontvangen" als alles akkoord is
         |
Partners reageren (bevestigen / alternatief / afwijzen)
         |
Klant geeft definitief per-item akkoord
 op bevestigde/alternatieve onderdelen
```
