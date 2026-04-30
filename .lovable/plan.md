## Doel

Een publieke (anon) leesbron creëren met **uitsluitend niet-gevoelige partner-velden**, zonder de `partners` tabel zelf open te zetten. Dit voorkomt lekken van e-mail, telefoon, IBAN, KvK, `initial_password`, interne notities, enz.

## Bevindingen uit codebase-check

Het door jou voorgestelde SQL-statement faalt in de huidige database:

- Kolom `**is_public` bestaat niet** op `public.partners` → moet eerst toegevoegd worden.
- Kolommen `**food_drink_subtype` en `accommodation_subtype` bestaan niet** als losse velden. Het schema gebruikt:
  - `partner_type` (text) — bijv. `food_drink`, `accommodation`, `activity`
  - `accommodation_types` (jsonb) — array van subtypes
  - er is geen apart `food_drink_subtype` veld
- `is_active` bestaat wel ✅
- Overige velden (`name`, `partner_type`, `map_tenant_slug`, `image_url`, `about_text`, `website_url`, `location_description`) bestaan ✅

## Stappen

### 1. Schema-uitbreiding (migratie)

- Voeg toe aan `partners`:
  - `is_public boolean not null default false`
- Backfill blijft `false` → admin kiest expliciet welke partners publiek getoond mogen worden (privacy-by-default).

### 2. Publieke view

Maak `public.partners_public` aan met `security_invoker = on` zodat RLS van de aanroeper geldt. De view selecteert alleen veilige, marketing-geschikte velden uit `partners` waar `is_active = true AND is_public = true`.

Whitelist velden:

- `id`, `name`, `partner_type`
- `map_tenant_slug` (publieke MAP-koppeling, geen secret)
- `image_url`, `gallery_images`
- `about_text`, `highlight_features`
- `website_url`
- `location_description`, `location_lat`, `location_lng`
- `accommodation_types` (jsonb met subtypes)
- `accommodation_description`

Bewust **niet** opgenomen: `email`, `contact_email`, `phone`, `kvk_number`, `address_*`, `bank_*`, `commission_*`, `partner_token`, `auth_user_id`, `map_api_key`, `initial_password`, `booking_contact_*`, `availability_notes`, `reference_number`, `terms_*`, login-/timestamp-velden.

### 3. Toegang regelen via RLS op de basistabel

Omdat de view met `security_invoker` draait, moet `anon` SELECT-rechten hebben op de **gewhiteliste rijen** in `partners`. We doen dit via een nauwsluitende RLS-policy:

```
create policy "Anon can read public partner directory (limited)"
on public.partners
for select
to anon
using (is_active = true and is_public = true);
```

Belangrijk: RLS-policies werken op rij-niveau, niet op kolom-niveau. Een anon die rechtstreeks `partners` queryt zou nog steeds álle kolommen van een publieke rij zien. Twee opties:

- **Optie A (aanbevolen, eenvoudig)**: REVOKE de directe SELECT op `public.partners` voor `anon`/`authenticated` op kolom-niveau, en GRANT alleen de whitelist kolommen. PostgREST respecteert dit en `partners_public` blijft werken via security invoker.
- **Optie B (sterkste isolatie)**: Maak de view `security_definer` (eigenaar = aparte beperkte rol) en geef anon **geen enkele** rechten op `partners`. Dan kan anon uitsluitend de view bevragen. Dit wijkt af van Supabase-best-practice (definer views) maar geeft strikte kolom-afscherming.

Voorstel: **Optie A**. We zetten kolom-grants restrictief en houden RLS op `partners` strikt (`is_active AND is_public`), zodat zelfs een directe query op `partners` door anon alleen publieke rijen + whitelist-kolommen teruggeeft.

### 4. Admin-UI: publiek vlag

In de partner-beheer pagina:

- Nieuwe toggle "Toon op publieke partners-pagina".
- Schrijft naar `is_public`.
- Standaard uit.
- Zichtbaar voor admins; niet voor partner zelf (privacy-controle blijft bij bureau).

### 5. Verificatie

- Manuele test als anon: `select * from partners_public;` → alleen `is_active AND is_public` rijen, alleen whitelist kolommen.
- Manuele test als anon: `select email from partners;` → moet falen / leeg zijn.
- Manuele test als admin: ongewijzigd toegang.

## Te wijzigen bestanden / artefacten

- **Migratie**: kolom `is_public`, RLS-policy op `partners`, kolom-GRANTs, view `partners_public`.
- **Admin partners-edit pagina** (frontend): toggle voor `is_public`.
- **Memory** (`mem://infrastructure/security-and-rls-architecture-logic`): aanvulling dat `partners_public` view de enige publieke route is en `is_public` opt-in vlag is.

## Open vragen voor jou

1. **Welke velden moeten écht publiek zijn?** Het lijstje hierboven is mijn voorstel; wil je iets toevoegen (bv. partner_type-specifieke labels) of weghalen (bv. lat/lng)?   
  
We moeten nog onderschei maken in logies / activiteitenpartner?   

2. **Is er al een publieke "Onze partners" pagina/route gepland**, of wordt deze view eerst alleen door de configurator/marketing-pagina's gebruikt? Dat bepaalt of we ook frontend-werk meenemen of alleen de datalaag.  

  Lovable project: [https://lovable.dev/projects/cf02a7fd-e75a-45b9-85af-9fede68316d5](https://lovable.dev/projects/cf02a7fd-e75a-45b9-85af-9fede68316d5)  

3. **Akkoord met privacy-by-default (`is_public = false`)?** Anders zet ik bestaande actieve partners standaard op `true`. True please. 

Geef antwoord op deze 3 punten, dan zet ik na jouw goedkeuring de migratie en code-aanpassingen klaar.