

## Plan: Override_people wijzigingen persisteren naar database

### Probleem
Wanneer een klant het aantal deelnemers per onderdeel wijzigt (`override_people`), wordt dit alleen in de React-state opgeslagen. Bij paginaverversing of navigatie gaat de wijziging verloren. Bovendien:
- `getPendingChanges()` detecteert geen `override_people` wijzigingen (alleen tijd, dag, annulering)
- `update-customer-program` edge function kent `override_people` niet
- Partners worden dus niet geïnformeerd over het gewijzigde aantal

### Oplossing

**1. `src/hooks/useCustomerProgram.ts` — override_people als pending change detecteren**

In `getPendingChanges()` een extra check toevoegen:
```
if (item.override_people !== original.override_people) {
  changes.push({
    type: "people_changed",
    itemId: item.id,
    itemName: item.block_name,
    providerName: item.provider_name,
    providerEmail: item.provider_email,
    oldValue: original.override_people ? String(original.override_people) : "groepstotaal",
    newValue: item.override_people ? String(item.override_people) : "groepstotaal",
  });
}
```

**2. `supabase/functions/update-customer-program/index.ts` — override_people verwerken**

- `PendingChange` interface uitbreiden met `type: "people_changed"`
- Bij het verwerken van changes: als type `people_changed`, update `program_request_items.override_people` in de database
- Optioneel: partner notificeren als het item al bij een partner is aangevraagd (status niet `concept`)

**3. Edge function `ProgramRequestItem` interface uitbreiden**

Het `override_people` veld toevoegen zodat de edge function de huidige items correct kan verwerken bij submit.

### Resultaat
- Klant wijzigt deelnemers → verschijnt in "Wijzigingen doorvoeren" overzicht
- Na doorvoeren: opgeslagen in database, overleft paginaverversing
- Partner wordt geïnformeerd als het item al was aangevraagd

### Bestanden
1. `src/hooks/useCustomerProgram.ts` — people_changed detectie in getPendingChanges
2. `supabase/functions/update-customer-program/index.ts` — people_changed afhandeling + override_people persisteren

