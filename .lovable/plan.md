

# Jack Frieling (BV-2602-0001) migreren naar Maatwerk

## Huidige situatie

- **Klant**: Jack Frieling (Unive Samen)
- **Referentie**: BV-2602-0001
- **Huidig type**: `self_service`
- **Status**: active
- **Facturatiemodus**: `bureau_central`
- **Items**: 7 activiteiten, allemaal status `pending` met `item_quote_status: concept`

## Wat wordt er aangepast?

Een enkel database-update statement:

```sql
UPDATE program_requests
SET program_type = 'admin_managed'
WHERE id = 'd548e22b-663d-439c-b0fa-f2b5441a00cd';
```

Dit verandert het project naar maatwerk-modus, waardoor:
- De admin volledige controle heeft over prijzen en het programma
- Automatische partnernotificaties onderdrukt worden tot de offerte is verstuurd
- De offerte-workflow beschikbaar wordt (offerte samenstellen, PDF genereren, versturen naar klant)

## Wat verandert er NIET?

- Alle 7 bestaande items blijven behouden
- De klantgegevens en het klantportaal blijven intact
- De facturatiemodus (`bureau_central`) blijft ongewijzigd

