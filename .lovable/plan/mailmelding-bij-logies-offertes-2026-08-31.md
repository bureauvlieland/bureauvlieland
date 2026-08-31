# Mailmelding bij logies-offertes

## Wat er nu gebeurt

Bij een ingediende logiesofferte maakt de backend alleen een werkbanktaak aan — er gaat bewust geen mail (in de code staat letterlijk "Bureau-mail bij nieuwe offerte is geschrapt"). Ook bij een afwijzing/alternatieve datums blijft het bij een werkbanktaak. Je krijgt dus alleen een melding als je zelf in de Werkbank kijkt.

## Wat we bouwen

Direct een mail naar hallo@bureauvlieland.nl bij drie momenten:

1. **Offerte ingediend** — eerste indiening door een logiespartner.
2. **Offerte herzien** — partner past een eerder ingediende offerte aan (herkenbaar aan een reeds gevulde indieningsdatum).
3. **Offerte afgewezen** — inclusief de variant "andere datums voorgesteld", met de opgegeven reden.

De mail bevat: projectreferentie + klant/bedrijf, partner- en accommodatienaam, aankomst/vertrek en aantal gasten, totaalbedrag (incl. btw) en geldigheid, bij afwijzing de reden en eventuele voorgestelde datums, plus een knop rechtstreeks naar de logiesaanvraag in de admin.

Onderwerpen (herkenbaar in je inbox):
- `Nieuwe logiesofferte — {Partner} voor {Klant} ({BV-nummer})`
- `Herziene logiesofferte — {Partner} voor {Klant} ({BV-nummer})`
- `Logiesaanvraag afgewezen — {Partner} voor {Klant} ({BV-nummer})`

De werkbanktaak blijft gewoon bestaan; de mail is een extra signaal, geen vervanging.

## Technisch

- Mail via de bestaande Mailjet-laag (`_shared/mailjet-send.ts`) met `getRecipientEmail()` zodat preview-omgevingen de test-reroute houden en er geen onterechte `[TEST]`-prefix in productie komt.
- Verzenden vanuit twee bestaande edge functions, geen nieuwe function:
  - `create-quote-review-todo` — bepaalt zelf of het een eerste indiening of herziening is (op basis van bestaande `submitted_at`/versiehistorie in `accommodation_quote_history`) en kiest het bijpassende onderwerp.
  - `decline-accommodation-quote` — mail na het aanmaken van de todo/historie.
- Beide sends worden gelogd via `logEmail()` conform het e-maillogcontract, met `related_accommodation_id`, `related_partner_id` en verplichte `metadata.template_name` + `metadata.actor` (`"system → bureau (logiesofferte ingediend)"` etc.), zodat ze in het admin-logboek en het projectdossier terugkomen.
- Idempotentie: bij herhaalde aanroepen voor dezelfde offerte-versie geen dubbele mail (check op een bestaande `email_log`-rij met hetzelfde type binnen dezelfde versie). De bestaande "todo bestaat al"-shortcut mag geen mail meer overslaan bij een échte herziening.
- Faalpad: als Mailjet faalt, wordt dat gelogd als `status: "failed"` maar breekt de offerte-indiening niet af.
- Tests: unit-tests voor de keuze indiening/herziening en voor de onderwerpsopbouw; uitbreiding van de bestaande edge-function-testdekking.
