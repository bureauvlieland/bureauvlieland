## Probleem

Op het klantvoorstel toont het Overtocht-item een gele "Toelichting: Tijd 09:05 ingesteld door Bureau Vlieland". Die notitie is een **interne admin-actie** die plaatsvond *vóór* publicatie van de offerte — de klant ziet deze tijd voor het eerst en hoort dus geen "wijziging"-context te zien.

## Oorzaak

Twee plekken:

1. **`src/components/admin/AdminEditActivitySheet.tsx`** (regel 254–275): bij elke tijdswijziging — óók als het item nog `pending_added = true` (draft, nooit gepubliceerd) is — wordt `status_note = "Tijd HH:MM ingesteld door admin"` weggeschreven. Voor een draft is dat onnodig.
2. **`src/components/customer-portal/CustomerProgramItem.tsx`** (regel 343–356): elke `status_note` wordt 1-op-1 aan de klant getoond, ongeacht of het een admin-systeemnotitie of een echte aanbieder-toelichting is.

## Aanpassing

### 1. Schrijf geen systeem-status_note voor drafts
In `AdminEditActivitySheet.tsx`, binnen de `isStillDraft`-tak: laat `confirmed_time` en `proposed_time: null` staan (technisch nodig), maar verwijder `status_note` en `status_updated_at` uit de draft-update. Een nog niet gepubliceerd item heeft geen wijzigingshistorie nodig.

### 2. Filter admin-systeemnotities in de klantweergave
In `CustomerProgramItem.tsx` rond regel 343: voeg een helper toe die `status_note` strings als systeemruis herkent en niet rendert:

```ts
const ADMIN_SYSTEM_NOTE = /^Tijd (\d{1,2}:\d{2} ingesteld|verwijderd) door (admin|Bureau Vlieland)/i;
const isSystemNote = item.status_note && ADMIN_SYSTEM_NOTE.test(item.status_note);
```

Render het "Toelichting"-blok alleen wanneer `item.status_note && !isSystemNote`. Echte aanbieder-toelichtingen (bv. partner die alternatief tijdstip motiveert) blijven gewoon zichtbaar.

### 3. Backfill bestaande data
Eenmalige migratie die op `program_request_items` de `status_note` op `NULL` zet wanneer:
- `status_note` matcht het patroon `Tijd % ingesteld door %` of `Tijd verwijderd door %`, **en**
- `provider_id IN ('bureau', ...)` óf het item is auto-bevestigd zonder partnerinteractie.

Zo verdwijnt de melding ook bij reeds verstuurde voorstellen (zoals het NHL-project in de screenshot).

## Scope

Alleen frontend-render + één admin-update-pad + datacorrectie. Geen wijziging aan partner-portal, e-mails, of business-workflow.
