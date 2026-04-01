

## Plan: Bouwsteenprijzen automatisch overnemen bij aanvragen uit de configurator

### Probleem

Wanneer een klant via de configurator een programma aanvraagt, worden de items aangemaakt **zonder** `admin_price_override`. De prijzen staan wel in de bouwstenen (`building_blocks.price_adult`), maar worden niet meegekopieerd naar de `program_request_items`. Hierdoor ziet de admin geen prijs bij het samenstellen van een offerte.

Bij het **handmatig toevoegen** van items door een admin (AdminAddActivitySheet, ApplyTemplateDialog, AI-programma) wordt `price_adult` wél overgenomen als `admin_price_override`. Dit verschil zorgt voor het probleem.

### Oplossing

In de twee configurator-checkout flows de `admin_price_override` en `price_type` meenemen vanuit de bouwsteen:

| Bestand | Wijziging |
|---|---|
| `src/components/configurator/CheckoutContactForm.tsx` | Bij item-insert `admin_price_override: fullBlock?.price_adult ?? null` en `price_type` toevoegen |
| `src/components/configurator/RequestFormModal.tsx` | Idem |

### Bestaande aanvragen repareren

Daarnaast een eenmalige data-update om bestaande items die een `block_id` hebben maar geen `admin_price_override`, te vullen vanuit de gekoppelde bouwsteen:

```sql
UPDATE program_request_items pri
SET admin_price_override = bb.price_adult,
    price_type = COALESCE(pri.price_type, bb.price_type::text),
    updated_at = now()
FROM building_blocks bb
WHERE pri.block_id = bb.id
  AND pri.admin_price_override IS NULL
  AND pri.quoted_price IS NULL
  AND bb.price_adult IS NOT NULL;
```

Dit vult alle items die nog geen prijs hebben (noch admin_price_override noch quoted_price) met de huidige bouwsteenprijs. Items die al een partnerprijs hebben worden niet aangeraakt.

### Resultaat

- Nieuwe configurator-aanvragen krijgen automatisch de bouwsteenprijs als startpunt
- Bestaande aanvragen worden retroactief aangevuld
- De admin ziet direct een prijs bij het opmaken van een offerte

Drie kleine aanpassingen (twee bestanden + één data-update).
