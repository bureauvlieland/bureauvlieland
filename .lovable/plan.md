## Labelwijzigingen statuspillen klantpagina's

Op alle klantpagina's (mijn-programma, deelnemersweergave, splash) komt de pil-terminologie consistent in lijn met hoe u het bij klanten wilt uitleggen.

### Wijzigingen

1. **"Beschikbaar" → "Bevestigd"** (groene pil)
   In `src/components/customer-portal/ItemStatusBadge.tsx` hernoem ik het label voor `confirmed` van "Beschikbaar" naar "Bevestigd".
   In `src/components/customer-portal/CustomerProgramItem.tsx` (regel 155) verwijder ik de `overrideLabel="Beschikbaar"` zodat ook items die nog op klant-akkoord wachten gewoon "Bevestigd" tonen.

2. **Pending krijgt een amber pil "Pending"**
   Op dit moment laten we bewust geen pil zien als de partner nog niet heeft gereageerd (zie regel 145–150 in `CustomerProgramItem.tsx`). Dat vervang ik door een amber `MicroPill` met tekst **"Pending"** zodat beachgolf/lunch-achtige items duidelijk een statuslabel hebben.
   Tegelijk werk ik in `ItemStatusBadge.tsx` het pending-label (gebruikt in andere views) bij naar **"Pending"** met tone `amber`, zodat het overal gelijk is.

### Bestanden

- `src/components/customer-portal/ItemStatusBadge.tsx` — labels: `pending` → "Pending" (amber), `confirmed` → "Bevestigd".
- `src/components/customer-portal/CustomerProgramItem.tsx` — pending toont weer een pil; `overrideLabel` "Beschikbaar" verwijderd.

### Niet aangeraakt

- Admin- en partner-portaal terminologie (`itemStatus.ts`, `ItemDisplayStatusBadge`) blijft ongewijzigd — uw vraag gaat specifiek over de klantpagina's.
- Geen wijziging in onderliggende status-logica of workflows.
