

## Plan: Fietshuur migreren — bestaande partnerprijzen beschermen

### Aanpak

Eén database migratie met twee statements:

**1. Bouwsteen definitie updaten**
```sql
UPDATE building_blocks
SET price_type = 'per_person_per_day'
WHERE id = 'fiets-huur';
```

**2. Alleen items ZONDER partnerprijzen updaten**
```sql
UPDATE program_request_items
SET price_type = 'per_person_per_day'
WHERE block_id = 'fiets-huur'
  AND price_type IS DISTINCT FROM 'per_person_per_day'
  AND quoted_price IS NULL;
```

De `AND quoted_price IS NULL` voorwaarde zorgt ervoor dat items waar een partner al een definitieve prijs heeft ingevoerd, niet worden aangeraakt. Bij die items blijft het oorspronkelijke `price_type` behouden, en de `quoted_price` wordt altijd als vast groepstotaal behandeld (nooit vermenigvuldigd).

### Geen code-aanpassingen nodig

De `portalPricing.ts` logica behandelt `quoted_price` altijd als groepstotaal ongeacht `price_type`. Alleen `admin_price_override` wordt vermenigvuldigd. Dit werkt al correct.

