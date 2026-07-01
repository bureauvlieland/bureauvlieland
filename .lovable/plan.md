# Plan — Bewijsdossier BV-2603-0003 (Salure / Hotel Zeezicht)

Doel: één **compleet, cijfermatig sluitend** PDF-dossier dat op elke pagina onderbouwd is met een databron uit de eigen backend, plus een audit van álle andere geaccepteerde logies-offertes zodat je zeker weet waar dit nog kan spelen. Geen tegenstrijdigheden meer met eerdere sessies: dit dossier vervangt alle eerdere versies en wordt getagd `v3-final`.

## Wat er wél / niet klopt aan eerdere versies

Eerdere sessies noemden verschillende bedragen (€6.844 → €6.446 → €5.119,92) zonder duidelijk te maken uit welke bron elk bedrag komt. Dat leverde de indruk van tegenstrijdigheid op. Feitelijk zijn álle drie bedragen echt en horen ze bij verschillende momenten in dezelfde quote (`1584d8c2-…`). Het dossier gaat elk bedrag koppelen aan **één specifieke bron met timestamp**.

## Bronnen die ik ga bevriezen als bewijs

1. `accommodation_quotes.1584d8c2-fc8e-4f48-869e-aa6048c52e2f` — huidige waarde (`price_total = 5119.92`, `selected_at = 2026-04-01 07:06`, `updated_at = 2026-06-10 16:04:51`).
2. `accommodation_quote_history` v1 (gemaakt 2026-06-10 16:04:51.545) — snapshot van vóór de mutatie: `price_total = 6446`, kamers `8×€179 + 9×€199`, includes `[Ontbijt]`.
3. `email_log` — chronologie van álle mails aan `zwaan@salure.nl` en `manager@zeezichtvlieland.nl` rond deze quote: aanvragen, offerte-mails, klant-akkoord bevestiging, factuur `FV-BV-2603-0003-001` (10 juni 20:23), chat-notificaties.
4. `admin_activity_log` + `updated_at` op de quote — wie de mutatie op 10 juni 16:04 heeft uitgevoerd (admin-user of edge function).
5. `bureau_invoices` / `program_item_billing_lines` — welk bedrag uiteindelijk aan Salure gefactureerd is en welk bedrag Zeezicht als inkoopfactuur heeft ingediend.

## Structuur van het PDF-dossier (`Bewijsdossier_BV-2603-0003_v3.pdf`)

1. **Samenvatting (1 pag.)** — Wat er is gebeurd, in klare taal, met de drie bedragen en hun bron.
2. **Tijdlijn** — Elke regel = timestamp + gebeurtenis + bron-tabel + evt. e-mail-ID. Van eerste aanvraag t/m factuur en het geschil.
3. **Financiële reconciliatie** — Tabel: geoffreerd door partner / gepresenteerd aan klant / akkoord klant / gefactureerd aan klant / inkoop van partner. Verschillen expliciet benoemd, incl. ontbijt-component.
4. **Root cause** — De UI-zwakte: partner kon in `PartnerAccommodation.tsx` een `price_total` invullen die lager is dan de som van de kamerconfiguratie zonder blokkade. Verwijzing naar exact bestand + regel.
5. **Bewijsstukken (bijlagen)** — Screenshots + JSON-snapshots:
   - Klantpagina zoals die op 1 april werd getoond (reproductie via Playwright met historische data).
   - Partner-portal weergave van dezelfde quote.
   - E-mail body van akkoord-mail aan partner (uit `email_log`).
   - Ruwe DB-snapshots (JSON) van quote v1 (history) én huidige quote.
6. **Acties reeds genomen** — Wat sinds vorige week live is: acceptatie-mails tonen nu kamerconfig + `includes`; contract-tests op partner-update payload; RLS-guards.
7. **Aanbevolen aanvullende acties** — 3 concrete fixes met risico-inschatting:
   a. **DB-trigger** die `price_total` op `accommodation_quotes` blokkeert als hij < som(room_configuration × nights) is, tenzij een admin-flag `manual_override_reason` gezet is.
   b. **`accepted_terms_log` uitbreiding**: bij `select-accommodation-quote` een volledige JSON-snapshot van `room_configuration`, `includes`, `extras`, `price_total` wegschrijven zodat elke akkoord onbetwistbaar is.
   c. **Audit-view** in admin die per selected quote toont of `price_total` matcht met kamer-som (rood/geel/groen).
8. **Portfolio-audit** — Scan van álle `status='selected'` quotes: per project een regel met `price_total`, som van `room_configuration`, delta, en of er ná `selected_at` nog een mutatie is geweest op `price_total`. Dit toont exact welke andere projecten hetzelfde risico dragen.

## Werkstappen (bij build-mode)

1. SQL-scripts uitvoeren voor tijdlijn, reconciliatie en portfolio-audit; ruwe output naar `/tmp` en gefilterde tabellen naar het PDF.
2. Historische klantpagina reproduceren met Playwright tegen lokale preview, met de v1-history als gemockte quote-data → screenshots naar `/tmp/browser/`.
3. PDF genereren met `reportlab` (bestaande skill) → `/mnt/documents/Bewijsdossier_BV-2603-0003_v3.pdf`.
4. QA-pass: elke pagina naar image, visueel controleren, fixen.
5. Losse `Portfolio_Audit_geaccepteerde_logies.csv` naast het PDF leveren.

## Wat ik NIET doe in deze ronde

- Geen wijzigingen aan producten of workflows. Aanbeveling 7a/b/c staat in het dossier maar wordt pas gebouwd na jouw expliciete akkoord.
- Geen e-mail naar Zeezicht/Salure versturen. Het dossier is intern; jij bepaalt de vervolgcommunicatie.

## Vragen vóór ik bouw

1. Wil je dat de portfolio-audit **alle** `selected` quotes meeneemt of alleen die van dit lopende seizoen (bijv. `selected_at >= 2026-01-01`)?
2. De historische klantpagina-screenshot: ok dat ik daarvoor tijdelijk in Playwright de v1-history als mock injecteer (geen DB-mutatie), of wil je alleen tekstuele reconstructie zonder screenshot?
