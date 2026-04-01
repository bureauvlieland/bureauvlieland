

## Plan: Locatie en beschrijving meenemen bij configurator-aanvragen

### Probleem

De twee configurator-checkout flows (`CheckoutContactForm.tsx` en `RequestFormModal.tsx`) kopiëren bij het aanmaken van items **geen** `location_lat`, `location_lng`, `location_address` en `admin_price_notes` (beschrijving voor de klant) vanuit de bouwsteen. De admin-flows (handmatig toevoegen, templates, AI) doen dit wel.

### Oplossing

In beide bestanden bij de item-insert drie locatievelden en de beschrijving toevoegen:

```ts
location_lat: fullBlock?.location_lat ?? null,
location_lng: fullBlock?.location_lng ?? null,
location_address: fullBlock?.location_address ?? null,
admin_price_notes: fullBlock?.description || fullBlock?.short_description || null,
```

### Bestaande aanvragen repareren

Eenmalige SQL-update om items zonder locatie/beschrijving te vullen vanuit hun gekoppelde bouwsteen:

```sql
UPDATE program_request_items pri
SET
  location_lat = COALESCE(pri.location_lat, bb.location_lat),
  location_lng = COALESCE(pri.location_lng, bb.location_lng),
  location_address = COALESCE(pri.location_address, bb.location_address),
  admin_price_notes = COALESCE(pri.admin_price_notes, bb.description, bb.short_description),
  updated_at = now()
FROM building_blocks bb
WHERE pri.block_id = bb.id
  AND pri.admin_price_notes IS NULL
  AND (bb.location_lat IS NOT NULL OR bb.description IS NOT NULL OR bb.short_description IS NOT NULL);
```

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/components/configurator/CheckoutContactForm.tsx` | 4 velden toevoegen aan item-insert |
| `src/components/configurator/RequestFormModal.tsx` | Idem |
| Migratie (SQL) | Bestaande items retroactief aanvullen |

