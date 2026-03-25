

## Plan: Correcte partnernamen bij aanmaken programma-items

### Probleem
Bij het indienen van een programma via de configurator wordt `provider_name` altijd gezet op "Bureau Vlieland". Dit komt doordat de code `block?.provider?.name || "Bureau Vlieland"` gebruikt, maar de FK-join op `building_blocks` levert in de publieke context geen partnerdata op (partners-tabel is niet publiek leesbaar voor anonieme gebruikers).

De `provider_id` wordt wél correct opgeslagen (bijv. `zuiver`, `vlieland-outdoor-center`), maar de `provider_name` is altijd de fallback.

### Oorzaak
De RLS-policy op de `partners` tabel vereist authenticatie of een MAP-linked partner. Anonieme gebruikers (configurator) kunnen de FK-join niet uitvoeren → `provider` is `null` → fallback naar "Bureau Vlieland".

### Oplossing

**Bestand: `src/components/configurator/CheckoutContactForm.tsx`**

Na het inserten van de `program_request_items`, een extra stap toevoegen die de partnernamen verrijkt — vergelijkbaar met de bestaande logica in `ApplyTemplateDialog.tsx`:

1. Verzamel unieke `provider_id`'s die niet `"bureau"` of leeg zijn
2. Query de `partners` tabel voor naam en e-mail (dit werkt omdat de insert al gebeurd is via de edge function, of we doen dit server-side)

**Alternatief (eenvoudiger)**: Verplaats de verrijking naar de **edge function `send-program-request`**, die met service-role rechten wél de partners-tabel kan lezen. Na het aanmaken van items, update de `provider_name` en `provider_email` voor alle items met een niet-bureau `provider_id`.

**Aanbevolen aanpak**: Edge function `send-program-request/index.ts`
- Na de insert van `program_request_items`, query `partners` met de unieke `provider_id`'s
- Update `provider_name` en `provider_email` op de zojuist aangemaakte items
- Dit werkt gegarandeerd omdat edge functions service-role toegang hebben

**Bestanden**:
1. `supabase/functions/send-program-request/index.ts` — verrijking toevoegen na item-insert (of: na request-insert, als items daar worden aangemaakt)
2. `src/components/configurator/CheckoutContactForm.tsx` — verrijking toevoegen na item-insert (client-side, als fallback)

Aangezien de items client-side worden geïnsert in `CheckoutContactForm.tsx` (regel 164), en de client geen toegang heeft tot de partners-tabel, is de beste plek de **edge function**. Maar de items worden al vóór de edge function call geïnsert (regel 164 vs 178). Dus:

**Concrete aanpak**:
- In `CheckoutContactForm.tsx`, na de items insert, een aparte update doen: items met een niet-lege `provider_id` (niet "bureau") verrijken via een lookup op de `building_blocks` tabel (die wél publiek leesbaar is voor published blocks) — de `provider_id` is al correct, we hoeven alleen de `provider_name` te zetten vanuit de block data die we al in geheugen hebben.

Wacht — we hebben `allBlocks` al geladen met de FK-join. Als de join faalt voor anonieme gebruikers, dan is het probleem fundamenteler. Laat me een eenvoudigere fix voorstellen:

**Definitieve aanpak — 2 wijzigingen**:

1. **`src/components/configurator/CheckoutContactForm.tsx`** (regel 149): Gebruik `block.providerId` om de naam op te zoeken uit de al geladen blocks. Als `provider.name` niet beschikbaar is, sla `provider_id` op als naam (beter dan hardcoded "Bureau Vlieland").

2. **`supabase/functions/send-program-request/index.ts`**: Na het versturen van e-mails, verrijk `provider_name` en `provider_email` op alle items van dit request door partners op te zoeken met de service-role client. Dit garandeert correcte data ongeacht client-side beperkingen.

### Bestaande data repareren
Een eenmalige query om bestaande items te fixen:
```sql
UPDATE program_request_items pri
SET provider_name = p.name, provider_email = COALESCE(p.contact_email, p.email)
FROM partners p
WHERE pri.provider_id = p.id
AND pri.provider_name = 'Bureau Vlieland'
AND pri.provider_id != 'bureau'
AND pri.provider_id != '';
```

