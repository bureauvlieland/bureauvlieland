

## Plan: Fix logies-bevestiging todo's — projectkoppeling en partnernaam

### Probleem
1. **Niet gekoppeld aan project**: De todo die wordt aangemaakt bij het selecteren van een logiesofferte zet `related_request_id` niet, waardoor de taak onder "Niet gekoppeld aan project" valt
2. **"(bureau_central)" in beschrijving**: De tekst toont het facturatiemodel in plaats van de naam van de logiespartner

### Oplossing

**`supabase/functions/select-accommodation-quote/index.ts`** — regel 258-264:

Huidige code:
```typescript
await supabase.from("admin_todos").insert({
  title: todoTitle,
  description: `Klant heeft gekozen voor ${quote.accommodation_name}. ${isCentralBilling ? "Stuur bevestiging naar klant en partner (bureau_central)." : "Partner is genotificeerd met klantgegevens."}`,
  priority: "high",
  auto_type: "accommodation_selected",
  auto_entity_id: request.id,
});
```

Nieuwe code:
```typescript
await supabase.from("admin_todos").insert({
  title: todoTitle,
  description: `Klant heeft gekozen voor ${quote.accommodation_name}. Stuur bevestiging naar klant en partner ${quote.accommodation_name}.`,
  priority: "high",
  auto_type: "accommodation_selected",
  auto_entity_id: request.id,
  related_request_id: request.linked_program_id || null,
  related_partner_id: quote.partner_id || null,
});
```

Wijzigingen:
- `related_request_id` wordt gezet op `request.linked_program_id` zodat de taak bij het juiste project verschijnt
- `related_partner_id` wordt gezet op `quote.partner_id`
- Beschrijving vermeldt nu de echte partnernaam in plaats van het facturatiemodel

### Bestaande taken
De 4 bestaande taken zonder projectkoppeling worden opgeruimd door de eerder gebouwde "Opschonen"-functie, of kunnen handmatig worden afgehandeld.

### Bestanden
1. `supabase/functions/select-accommodation-quote/index.ts`

