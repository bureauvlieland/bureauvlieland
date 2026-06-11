# Onterechte "Klant akkoord" op gekopieerde items

## Wat er gebeurt
Bij het opslaan van een onderdeel in de admin-edit-sheet wordt — als facturatie op **Bureau Vlieland** staat en `status="pending"` — automatisch `customer_accepted_at` en `customer_approved_at` gezet. Dat is bedoeld voor échte interne posten (vrije tijd, ferry, kostenpost) die geen klant- of partnergoedkeuring nodig hebben.

Maar bij **gekopieerde onderdelen** (`pending_added=true`, nog niet gepubliceerd) heeft de klant het item nog niet gezien. De stempel is dan onjuist.

Bevestigd in project Klazien Van Den Brink (2V-2022-2295):
- **Zeehondentocht dag 2** — gemaakt 07:34:04, "klant akkoord" 07:34:26 (22s later)
- **Fietstocht dag 2** — gemaakt 07:35:21, "klant akkoord" 07:37:28
Beide hebben `pending_added=true` → klant zag dit nooit.

## Plan

### 1. Bugfix in `AdminEditActivitySheet.tsx` (regel 286)
Auto-stempel `customer_accepted_at` / `customer_approved_at` **alleen** voor publieke onderdelen, niet voor drafts:

```ts
if (isBureauInvoiced && item.status === "pending" && !item.pending_added) {
  // bestaande gedrag: bureau-item live → meteen confirmed + klant-akkoord
}
```

Voor een `pending_added` draft wordt enkel `block_type`, `provider_id` etc. opgeslagen. Bij **Publiceer & notificeer** loopt het item door de normale workflow: klant ziet het en moet akkoord geven (of admin kan via de losse knop "klant-akkoord namens klant" stempelen).

### 2. Opschonen huidige twee items
Reset op de twee specifieke items in dit project:
```sql
UPDATE program_request_items
SET customer_accepted_at = NULL,
    customer_approved_at = NULL,
    status = 'pending'
WHERE id IN (
  '753e7a90-476d-4388-8c21-b6f504337fef',  -- Zeehondentocht dag 2
  '02f0c0ab-ca30-4fb0-98e4-effbc7714912'   -- Fietstocht dag 2
);
```
Logregel in `program_request_history`: `action='admin_correction'`, reden "Onterecht klant-akkoord teruggedraaid — item was nog niet gepubliceerd".

### 3. Historische scan (optioneel — vraag aan u)
Mogelijk zijn er meer projecten waar dit speelde. Ik kan een read-query draaien op alle items met `pending_added=true AND customer_accepted_at IS NOT NULL` om te kijken of er meer "vervuiling" is. Laat weten of u dat wilt.

### 4. Geen wijziging nodig in:
- `handleDuplicateItem` en `CopyFromProgramDialog` — die strippen `customer_accepted_at` correct.
- `deriveItemDisplayStatus` — die leest gewoon de waarheid uit de DB.

## Wat verandert er voor u in de UI?
- Na de fix toont een **vers gekopieerd** item altijd "Wacht op klant-akkoord" (correct), ook als de facturatie op Bureau Vlieland staat.
- Pas na **Publiceer & notificeer** loopt het normaal mee in de klant-workflow.
- Bestaande live bureau-onderdelen (vrije tijd, ferry) blijven werken zoals nu — die zijn niet `pending_added`.
