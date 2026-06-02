## Probleem

Op project **BV-2605-0014** (Petra Dolstra) ontbreken de knoppen **"Offerte versturen"** en de primaire actie rechtsboven. In de database staat `quote_status = NULL`, terwijl de offerte-status-dropdown via een UI-fallback "Concept" toont. Daardoor faalt de render-conditie:

```ts
isQuoteMode && request.quote_status && ["concept","in_afstemming"].includes(request.quote_status)
// → null is falsy → knop verdwijnt
```

Hetzelfde geldt voor de "Preview offerte (PDF)"-menu-item in het ⋯-menu.

## Oplossing (2 lagen)

### 1. Frontend — direct herstel (defensief)
In `src/pages/admin/AdminRequestDetail.tsx` de check normaliseren met dezelfde fallback als de dropdown:

```ts
const effectiveQuoteStatus = request.quote_status ?? (isQuoteMode ? "concept" : null);
```

en die gebruiken in:
- de `AdminSendQuoteDialog`-conditie (regel ~1351)
- de "Preview offerte (PDF)"-menu-item (regel ~1379)

Hiermee zien álle bestaande maatwerk-projecten zonder `quote_status` meteen weer hun verzendknop.

### 2. Data-fix — eenmalige migratie
Backfill `quote_status = 'concept'` voor alle bestaande maatwerk-aanvragen waar het veld nog `NULL` is:

```sql
UPDATE public.program_requests
SET quote_status = 'concept'
WHERE request_type = 'quote'
  AND quote_status IS NULL;
```

### 3. Preventie — nieuwe rijen
Default zetten zodat dit niet meer kan ontstaan:

```sql
ALTER TABLE public.program_requests
  ALTER COLUMN quote_status SET DEFAULT 'concept';
```

(Bestaande NULL's zijn al opgelost door stap 2; nieuwe maatwerk-aanvragen krijgen automatisch `concept`.)

## Verificatie

- Open BV-2605-0014 → "Offerte versturen"-knop staat naast Chat.
- Statusdropdown toont nog steeds "Concept" en blijft werken.
- Andere maatwerk-projecten met al een gevulde `quote_status` blijven ongewijzigd.
