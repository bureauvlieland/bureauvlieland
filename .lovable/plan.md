

## Plan: Partnernotificaties altijd versturen (ook bij maatwerk)

### Probleem
Bij maatwerk-aanvragen (en soms ook bij reguliere aanvragen) kan het veld `provider_email` op een `program_request_item` leeg (NULL) zijn. De huidige code in zowel `cancel-program-request` als `update-customer-program` slaat partners zonder `provider_email` over. Hierdoor krijgen partners geen annulerings- of wijzigingsmails.

De `block_type !== "self_arranged"` filter is correct (eigen-regeling items hoeven geen partnernotificatie), maar de `provider_email`-check is te streng: als het veld niet ingevuld is, moet er een fallback-lookup naar de `partners` tabel gedaan worden.

### Oplossing
Een herbruikbare helper-functie toevoegen die voor alle items zonder `provider_email` de e-mail ophaalt uit de `partners` tabel (op basis van `provider_id`). Dit wordt toegepast in beide edge functions.

### Wijzigingen

**1. `supabase/functions/cancel-program-request/index.ts`**
- Na het ophalen van items: voor items zonder `provider_email` (maar met `provider_id` en `block_type !== "self_arranged"`), een batch-lookup doen in de `partners` tabel
- De gevonden e-mails invullen voordat de provider-map wordt opgebouwd
- Zo krijgen alle relevante partners een annuleringsmail

**2. `supabase/functions/update-customer-program/index.ts`**
- Dezelfde fallback-lookup toevoegen op alle plekken waar `provider_email` wordt gecontroleerd:
  - Bij `numberOfPeople` wijziging (regel ~345)
  - Bij individuele item-statusupdates (regel ~626, ~694)
  - Bij `acceptTerms` flow (regel ~980)
  - Bij nieuwe items toevoegen (regel ~1163)

### Technische aanpak

Beide edge functions krijgen een helper-functie bovenaan:

```typescript
async function enrichProviderEmails(
  supabase: any,
  items: any[]
): Promise<void> {
  // Collect provider_ids that lack an email
  const missingEmailIds = [
    ...new Set(
      items
        .filter(i => !i.provider_email && i.provider_id && i.block_type !== "self_arranged")
        .map(i => i.provider_id)
    ),
  ];
  if (missingEmailIds.length === 0) return;

  const { data: partners } = await supabase
    .from("partners")
    .select("id, email, name")
    .in("id", missingEmailIds);

  const partnerMap = new Map((partners || []).map(p => [p.id, p]));

  for (const item of items) {
    if (!item.provider_email && item.provider_id) {
      const partner = partnerMap.get(item.provider_id);
      if (partner) {
        item.provider_email = partner.email;
        if (!item.provider_name) item.provider_name = partner.name;
      }
    }
  }
}
```

Vervolgens wordt `await enrichProviderEmails(supabase, items)` aangeroepen direct na het ophalen van de items, voordat de bestaande filter-/map-logica draait. De rest van de code hoeft niet te veranderen.

| Bestand | Wijziging |
|---|---|
| `supabase/functions/cancel-program-request/index.ts` | Helper toevoegen + aanroepen na items-fetch (regel ~95) |
| `supabase/functions/update-customer-program/index.ts` | Dezelfde helper toevoegen + aanroepen op relevante plekken waar items worden verwerkt |

### Resultaat
- Alle partners met een `block_type !== "self_arranged"` krijgen notificaties, ongeacht of `provider_email` op het item staat
- Geen wijziging in gedrag voor items die al een `provider_email` hebben
- `self_arranged` items blijven correct uitgesloten
