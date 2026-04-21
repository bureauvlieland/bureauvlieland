

## Plan: Oliva, Zuiver en alle bouwsteen-partners weer zichtbaar maken op `/partners`

### Diagnose
De `usePublicPartners`-query in `src/pages/Partners.tsx` probeert via een PostgREST nested select de partner-gegevens op te halen vanuit `building_blocks`:
```ts
.select("provider_id, partner:partners!building_blocks_provider_id_fkey(...)")
```
Maar er bestaat **geen foreign-key constraint** tussen `building_blocks.provider_id` en `partners.id` (zie schema: "No foreign keys for the table building_blocks"). Daardoor faalt de embed stilletjes → `partner` is `null` → álle blok-rows worden geskipt door `if (!p || !p.is_active) continue;`.

Alleen Stap 2 (MAP-partners) levert resultaten. Resultaat: pagina toont nu uitsluitend de 6 MAP-partners (Brouwerij Fortuna, Kaasbunker, Paal 50, Lepelaar, Vliehors Expres, Zeehondentochten). Alle 10+ partners die alleen via bouwstenen leveren (Oliva, Zuiver, Café Boven, Manege, Yoga, VOC, Bazuin, Zeezicht, Island Events etc.) verdwijnen.

### Fix — twee aparte queries, JS-side joinen
Vervang de gebroken embed door twee losse queries en koppel ze in JavaScript:

1. **Query A** — alle gepubliceerde blocks met `provider_id`:
   ```ts
   .from("building_blocks")
   .select("provider_id")
   .eq("status", "published")
   .not("provider_id", "is", null);
   ```
   Tel per `provider_id` het aantal blocks → `block_count` map.

2. **Query B** — alle actieve partners die ofwel:
   - voorkomen in de provider-set uit Query A, **of**
   - een `map_tenant_slug` hebben.
   ```ts
   .from("partners")
   .select("id, name, partner_type, image_url, about_text, website_url, location_description, map_tenant_slug")
   .eq("is_active", true)
   .or(`id.in.(${ids.join(",")}),map_tenant_slug.not.is.null`);
   ```
   Filter `id !== 'bureau'` eruit.

3. **Merge**: combineer partner-data met `block_count` (0 als alleen via MAP) en sorteer alfabetisch.

### Verbetering: tellingen kloppen ook
De huidige `counts` in de UI zijn ook fout omdat de lijst incompleet is. Met de fix herstellen "Alle partners (X)", "Activiteiten (X)" en "Accommodaties (X)" zich automatisch.

### Bestand
- `src/pages/Partners.tsx` — vervang `usePublicPartners` queryFn (regels ~28-77).

### Niet in scope
- FK aanmaken op `building_blocks.provider_id → partners.id` (kan later via migratie als gewenst voor data-integriteit, maar is niet nodig om de pagina te fixen).
- Wijzigingen aan UI/styling — alleen data-laag.

