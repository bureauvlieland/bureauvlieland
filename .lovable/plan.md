# Return-URLs in MAP: hosts invullen, niet volledige URL's

## Wat de logs zeggen

De laatste poging (Zeehondentochten, boeking 120218, 12:29 vandaag) is nog steeds geweigerd met exact dezelfde melding:

```text
400 — "returnUrl is missing, invalid, or its host is not whitelisted for this API key."
```

Dus de whitelist is nog niet actief voor de sleutel die wij gebruiken.

## Waarom het nog niet werkt

In het MAP-venster op je screenshot staat expliciet: *"Toegestane **domeinen** (hosts) ... Alleen exacte hosts worden toegestaan (bijv. `shop.voorbeeld.nl`)"*. Jij hebt volledige URL's ingevuld:

```text
https://bureauvlieland.nl/boeking-status      <- wordt niet herkend als host
```

MAP vergelijkt de **host** van onze returnUrl (`bureauvlieland.nl`) met de regels in dat vak. Een regel met `https://` en `/boeking-status` erin matcht die host niet. Vul daarom alleen de hosts in, elk op een eigen regel:

```text
bureauvlieland.nl
www.bureauvlieland.nl
visitvlieland.nl
www.visitvlieland.nl
```

Daarna opslaan; de kolom RETURN-URLS toont dan die hosts in plaats van "geen".

Belangrijk: dit staat **per API-sleutel per aanbieder**. De sleutels die wij gebruiken staan nu bij: Zeehondentochten Vlieland, De Vlielander Kaasbunker, Vliehors Expres, Brouwerij Fortuna, Natuur Educatie Centrum (Lepelaar), Paal 50. Elk van die accounts moet dit één keer instellen op de sleutel `bureau_vlieland`. Zolang dat niet staat, blijft de nette melding uit je eerste screenshot verschijnen (dat is bedoeld gedrag, geen bug).

## Wat ik daarnaast in de code verbeter

1. **Fallback-link naar de aanbieder werkt nu niet goed.** Bij Zeehondentochten staat de website in de database als `www.zeehondentochtenvlieland.nl` (zonder `https://`). De knop "Naar de site van de aanbieder" wordt daardoor als relatief pad gelezen en landt op onze eigen site. Ik normaliseer partner-website-URL's (schema toevoegen) voordat ze als link worden gebruikt.
2. **Zelftest per aanbieder in de admin.** Een knop "Test online betalen" bij de partner die één keer een betaling probeert te starten met een wegwerpboeking en die direct weer annuleert, en het resultaat toont als "whitelist OK" of "returnUrl niet toegestaan". Zo zie je per aanbieder of MAP goed staat zonder zelf te hoeven boeken.
3. **Overzicht boekingsstatus.** Compacte lijst van de laatste `booking_events` in de admin (aanbieder, tijd, status), zodat mislukte betalingen zichtbaar zijn zonder logs te lezen.
4. **Instructietekst voor aanbieders.** Klaar-om-te-mailen tekstje met precies de vier hosts en waar te klikken, beschikbaar naast de testknop.

## Technisch

- `src/lib/mapBooking.ts` / `supabase/functions/_shared/map.ts`: `normalizeWebsiteUrl()` toevoegen (schema erbij, alleen http/https), gebruikt in `providerFallbackUrl` en in `MapBookingDialog`.
- Nieuwe edge function `map-payment-selftest` (admin-only, JWT + `has_role(admin)`): maakt testboeking, probeert payment, annuleert altijd, retourneert `{ ok | return_url_not_whitelisted | no_api_key }`; logt in `booking_events` met status `selftest_*`.
- `AdminPartnerDetail.tsx`: testknop + resultaatbadge + instructietekst; klein `booking_events`-paneel (via admin-only RPC of directe select met admin-policy).
- Tests: unit op `normalizeWebsiteUrl` en op de foutclassificatie; Deno-test op de selftest-responsmapping.
