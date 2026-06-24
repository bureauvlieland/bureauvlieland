## Probleem

Bij annulering van een project worden alleen logiespartners getoond in de "Partners informeren"-modal als hun offerte-status `pending` of `submitted` is. Op `LOG-2606-0002` betekent dit:

- **Stortemelk** (`rejected`) — wel getoond
- **Zeezicht Vlieland** & **Westcord Strandhotel Seeduyn** (`expired` — offerte ingediend, maar `valid_until` verlopen) — **niet getoond**
- **Donia Huys, Hotel De Wadden, Vliemare, Torenzicht** (`declined`) — niet getoond

Juist de logies met `expired` quotes (offerte uit) houden vaak een optie open in hun eigen systeem en moeten een annuleringsmail kunnen krijgen.

## Fix

### 1. Filter verbreden in `cancel-program-request` edge function
`supabase/functions/cancel-program-request/index.ts` — in `cancelAccommodationRequest`:
- Quote-selectie verbreden naar `['pending','submitted','expired','declined','rejected']` zodat álle relevante partners als `affected_accommodation_partners` worden teruggegeven.
- Per partner een `quote_status` veld meegeven zodat de UI weet welke "voorgevinkt" moeten zijn.
- Auto-reject blijft alleen op `pending`/`submitted` (anders zetten we declined/rejected/expired terug naar rejected — onnodig).

### 2. Retro-flow gelijktrekken
`src/pages/admin/AdminRequestDetail.tsx` — in `openRetroCancellationNotify`: zelfde status-set hanteren + `quote_status` doorzetten.

### 3. Dialog: voorvinken differentiëren
`src/components/admin/PartnerCancellationNotifyDialog.tsx` + de twee type-definities:
- `AccommodationPartner` krijgt optioneel veld `quote_status?: string`.
- Default-aangevinkt: partners met status `pending`, `submitted` of `expired` (die hebben mogelijk een optie open).
- Default-uit: `declined`/`rejected` (al actief afgewezen).
- Bij iedere partner een klein statuslabel tonen ("Offerte verlopen", "Afgewezen door partner", "Niet gereageerd", …) zodat admin bewuste keuze kan maken.

### 4. Retroactief versturen voor LOG-2606-0002
Direct na deploy een eenmalige `notify-partner-cancellation`-invoke (via een korte Node/curl-stap of via een tijdelijk script in deze chat) met:
- `request_id` van de gekoppelde `program_request`
- `accommodation_partner_ids`: Zeezicht Vlieland en Westcord Strandhotel Seeduyn
- `skip_item_cancel: true`

Geen DB-migratie, geen wijzigingen aan klantportaal of mail-templates nodig.