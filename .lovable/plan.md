

# Fix: Partner e-mails worden niet verstuurd - ontbrekende provider_email

## Probleem

De edge function `accept-quote-proposal` vindt 2 items maar groepeert ze in 0 partner-groepen. Dit komt doordat `provider_email` op de items `NULL` is.

**Oorzaak**: Wanneer een admin een activiteit toevoegt via AdminAddActivitySheet, wordt `provider_email` opgehaald via `selectedBlock.provider?.email`. Maar de building blocks query haalt alleen `(id, name)` op van de partner -- niet `email`. Daardoor is `provider?.email` altijd `undefined` en wordt het item opgeslagen met `provider_email: null`.

In de edge function skipt `groupItemsByProvider()` items zonder `provider_email`, waardoor er geen partner-groepen ontstaan en geen e-mails worden verstuurd.

## Oplossing (twee onderdelen)

### 1. Building blocks query: email toevoegen aan partner join

In `src/hooks/useBuildingBlocks.ts` wordt de partner join uitgebreid van `(id, name)` naar `(id, name, email)`. Dit zorgt ervoor dat nieuwe items voortaan correct worden opgeslagen met de partner e-mail.

Betreft 3 plekken in het bestand:
- `useAdminBuildingBlocks` (regel 40)
- `useBuildingBlock` (regel 61)
- Eventuele andere queries die dezelfde join gebruiken

### 2. Edge function: partner e-mail opzoeken als fallback

In `accept-quote-proposal/index.ts` wordt `groupItemsByProvider()` aangepast zodat items zonder `provider_email` niet worden overgeslagen, maar de e-mail wordt opgezocht in de `partners` tabel. Dit maakt de functie robuust voor bestaande items die al zonder e-mail in de database staan.

De aangepaste flow:
1. Verzamel alle unieke `provider_id`'s van items (exclusief "bureau")
2. Haal de e-mails op uit de `partners` tabel in een enkele query
3. Gebruik de partner e-mail uit de database, met `provider_email` van het item als fallback

### 3. Bestaande items repareren

De 2 items van BV-2602-0006 hebben nu `provider_email: null`. Na de fix in de edge function worden deze automatisch correct afgehandeld bij de volgende "Verstuur naar partners" actie, omdat de edge function de e-mails dan opzoekt in de partners tabel.

## Bestanden die worden gewijzigd

- `src/hooks/useBuildingBlocks.ts` -- email toevoegen aan partner join (preventief)
- `supabase/functions/accept-quote-proposal/index.ts` -- partner e-mail lookup als fallback (fix voor bestaande + toekomstige items)

## Technische details

**useBuildingBlocks.ts** wijziging:
```typescript
// Was:
provider:partners!building_blocks_provider_id_fkey(id, name)
// Wordt:
provider:partners!building_blocks_provider_id_fkey(id, name, email)
```

**accept-quote-proposal/index.ts** wijziging in `groupItemsByProvider`:
```typescript
// Functie wordt async en accepteert supabase client
async function groupItemsByProvider(items, supabase) {
  // 1. Verzamel unieke provider IDs (exclusief bureau)
  const providerIds = [...new Set(
    items.filter(i => i.provider_id && i.provider_id !== "bureau")
         .map(i => i.provider_id)
  )];
  
  // 2. Haal emails op uit partners tabel
  const { data: partners } = await supabase
    .from("partners")
    .select("id, name, email")
    .in("id", providerIds);
  
  const partnerMap = new Map(partners?.map(p => [p.id, p]) || []);
  
  // 3. Groepeer items met partner email uit DB
  for (const item of items) {
    if (item.provider_id === "bureau") continue;
    const partner = partnerMap.get(item.provider_id);
    const email = item.provider_email || partner?.email;
    if (!email) continue;
    // ... rest van groupering
  }
}
```
