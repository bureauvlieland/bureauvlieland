# Betaling start niet: MAP weigert onze retour-URL

## Wat er nu gebeurt

De boeking bij Kaasbunker wordt wél aangemaakt (booking 120206), maar het starten van de betaling wordt door MijnActiviteitenPlanner geweigerd met:

```text
400 — "returnUrl is missing, invalid, or its host is not whitelisted for this API key."
```

Onze code valt dan terug op de "boek bij de aanbieder"-link `portal.mijnactiviteitenplanner.nl/kaasbunker`. Die pagina bestaat niet (404) — dat is de foutmelding op je screenshot. Er gaan dus twee dingen mis: MAP accepteert de retour-URL niet, en onze terugvaloptie stuurt de bezoeker naar een dode pagina.

De retour-URL die we sturen is `https://bureauvlieland.nl/boeking-status?b=...&t=...`. De Swagger van MAP bevestigt dat ons verzoek qua veldnamen klopt (`BookingId` + `ReturnUrl` op `POST /api/v1/payments`) en dat geldt: *"Its host must be whitelisted on the API key (AllowedReturnUrls)"*. Het is dus puur een instelling aan de MAP-kant per API-sleutel — niet iets in onze code.

## Wat ik ga bouwen

1. **Nooit meer een dode 404-terugvaloptie.** De terugval gebruikt niet langer een gegokte portal-URL. In plaats daarvan:
   - als de partner een `website_url` heeft: daarheen linken ("Boek bij <partner>");
   - anders: geen redirect, maar een duidelijke melding in de dialoog met telefoonnummer/e-mail van de aanbieder of Bureau Vlieland ("Online betalen is bij deze aanbieder nog niet actief").
2. **Herkenbare oorzaak in de dialoog.** Bij `returnUrl not whitelisted` loggen we in `booking_events` een aparte status (`payment_return_url_rejected`) zodat we per aanbieder zien wie nog niet is vrijgegeven, en zie ik dat terug in het adminoverzicht van boekingen.
3. **Retour-URL configureerbaar per aanbieder.** Optioneel veld op de partner (`map_return_origin`) zodat we, als MAP een specifieke host per sleutel whitelist (bijv. `visitvlieland.nl`), die zonder code-wijziging kunnen instellen. Standaard blijft `bureauvlieland.nl`.
4. **Tests**: unit-tests op de nieuwe terugval-logica en op het kiezen van de retour-origin, plus een Deno-test op de foutclassificatie in `map-book`.

## Wat jij moet doen (buiten de code)

Vraag MAP/de aanbieder om deze hosts te whitelisten op de API-sleutel(s):

- `bureauvlieland.nl` en `www.bureauvlieland.nl`
- `visitvlieland.nl` en `www.visitvlieland.nl`

Zolang dat niet gebeurd is, kan er via onze site niet online betaald worden — dan tonen we de nette terugval uit punt 1. Ik kan een kant-en-klare mail voor MAP opstellen als je wilt.

## Technisch

- `supabase/functions/_shared/map.ts`: `fallbackBookingUrl` vervangen door `providerFallback(partner)` dat `website_url` of `null` teruggeeft; `returnOriginFor(tenantSlug)` leest `map_return_origin`.
- `supabase/functions/map-book/index.ts`: response wordt `{ mode: "unavailable", providerUrl?, providerPhone?, reason }` als betalen niet kan; extra `booking_events`-status bij whitelist-afwijzing.
- `src/components/map/MapBookingDialog.tsx`: nieuwe `unavailable`-weergave i.p.v. blind redirecten.
- Migratie: `partners.map_return_origin text null` + adminveld in `AdminPartnerDetail.tsx`.
