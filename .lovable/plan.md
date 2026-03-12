

# Plan: Bureau-item taken proactief aanmaken + backfill

## Wat wordt gedaan

### 1. Proactieve todo-creatie in `accept-quote-proposal`
Na het versturen naar partners, bureau-items zonder prijs ophalen en per item een `bureau_item_pricing` todo aanmaken.

### 2. Proactieve todo-creatie in `AdminRequestDetail.tsx`
Bij het handmatig toevoegen van een bureau-item zonder prijs, direct een todo aanmaken.

### 3. Backfill met terugwerkende kracht
De bestaande `backfill-all-responded-todos` functie aanroepen — deze maakt al `bureau_item_pricing` todos aan voor bestaande bureau-items zonder prijs. Wordt direct uitgevoerd na deployment.

## Bestanden

- **Edit**: `supabase/functions/accept-quote-proposal/index.ts` — bureau-item pricing todos na partner-notificaties
- **Edit**: `src/pages/admin/AdminRequestDetail.tsx` — todo bij handmatig toevoegen bureau-item
- **Run**: `backfill-all-responded-todos` — eenmalig uitvoeren voor bestaande data

