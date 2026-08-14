# TUKTUK Vlieland aansluiten op MAP (direct boeken + betalen)

## Wat er nu is

- TUKTUK Vlieland staat wel als partner in de database (`TUKTUK Vlieland`, actief en publiek), maar heeft **geen MAP tenant-slug** en **geen API-sleutel**. Daarom verschijnt het aanbod niet in de directe-boekingsflow.
- De zes andere aanbieders (Zeehondentochten, Kaasbunker, Vliehors Expres, Brouwerij Fortuna, Lepelaar, Paal 50) hebben allebei wel en staan groen in de betaal-selftest.
- Slug wordt `tuktuk`.

## Aanpak

1. **Sleutel veilig aanleveren**
   Ik open het beveiligde secret-formulier voor `MAP_API_KEY_TUKTUK`. De waarde gaat direct naar de encrypted store: niet in de chat, niet in de code, niet in een migratiebestand.

2. **Sleutel serverside op de partner zetten**
   Een kleine admin-only edge function (`map-key-import`) leest de secret uit de omgeving en schrijft die naar `partners.map_api_key` van de opgegeven partner, samen met de tenant-slug `tuktuk`. De functie:
   - vereist een geldige admin-sessie (JWT-validatie + `has_role(admin)`),
   - geeft nooit de sleutel terug in de respons (alleen "gezet: ja/nee" en de laatste 4 tekens niet — enkel lengte),
   - is generiek bruikbaar voor volgende partners (parameter: partner-id + secretnaam).

3. **Direct verifiëren**
   - Aanbod ophalen via `map-proxy` voor slug `tuktuk`: klopt de sleutel en zijn er boekbare activiteiten?
   - Betaal-selftest draaien via het bestaande **Test online betalen**-paneel op de partnerpagina. Bij `return_url_not_whitelisted` staat de instructie klaar: in het MAP-portaal onder **RETURN-URLS** bij deze sleutel de hosts `bureauvlieland.nl` en `visitvlieland.nl` toevoegen (alleen hosts, geen paden).

4. **Zichtbaarheid controleren**
   Nagaan of TUKTUK-activiteiten daadwerkelijk opduiken op `/activiteiten-boeken` en in de boekingsdialoog, inclusief correcte duur- en prijsweergave.

5. **Tests**
   - Deno-test op de import-functie: zonder admin → 403, onbekende partner → 404, sleutel komt nooit in de respons.
   - Bestaande MAP-tests blijven groen.

## Technische details

- Nieuw: `supabase/functions/map-key-import/index.ts` (CORS, JWT-validatie, service-role write).
- Geen schemawijziging nodig: `partners.map_api_key`, `map_tenant_slug` en `map_return_origin` bestaan al.
- Optioneel invullen: `website_url` en `phone` van TUKTUK, zodat de "online betalen lukt hier nog niet"-fallback naar de juiste site en telefoonnummer wijst. Laat me weten als je die gegevens hebt.
