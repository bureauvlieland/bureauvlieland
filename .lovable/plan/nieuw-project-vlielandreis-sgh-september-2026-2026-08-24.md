# Nieuw project: Vlielandreis SGH september 2026

Aanmaken van een nieuw maatwerkproject op basis van het draaiboek, opgezet als kopie van BV-2604-0002 (mei-reis) maar met de aantallen en data van september. Alles blijft concept: er gaat niets naar klant of partners tot jij publiceert.

## Projectkop

- Klant: Ineke Haeck — Stedelijk Gymnasium Haarlem, i.haeck@sghaarlem.nl
- Data: 15, 16, 17, 18 september 2026 (3 nachten)
- Aantal personen: 153 (138 leerlingen + 15 begeleiders)
- Herkomst: maatwerk zakelijk, facturatie centraal via Bureau Vlieland
- Status: actief / offerte in concept
- Programmabeschrijving: samenvatting van het draaiboek (thema ODYSSEE, verdeling Stortemelk 91 pax / Lange Paal 62 pax, ferry 14:05 heen en 11:50 terug, boekingsnr. 13009193)
- Interne notitie met de openstaande punten uit §1 van het draaiboek (vragen aan school, Stortemelk, SBB, Jan van Vlieland, Zuiver, VOC, Bagagevervoer)

## Kostenposten (verzamelposten, zoals in mei)

Dezelfde regels als BV-2604-0002, herrekend naar de september-aantallen. Waar het draaiboek harde aantallen geeft, gebruiken we die; de rest wordt pro rata omgerekend van 166 naar 153 pax. Alle bedragen incl. BTW en als indicatie/concept — jij past ze aan zodra partners bevestigen.

- Kampeerterrein Stortemelk + staplaats + reserveringskosten (91 pax)
- Verblijf Lange Paal + schoonmaakkosten (62 pax)
- Apollotenten: 62 stuks (was 67)
- Zaalhuur Bolder, huur kooktent
- Fietshuur Lange Paal: 56 schoolfietsen, 2 damesfietsen, 3 e-bikes, 1 elektrische bakfiets
- Legertent Lange Paal
- Bagagevervoer retour (2 karren, 15/9 en 18/9)
- Catering avondmaaltijden: Stortemelk 91 pax x 3 en Zuiver Traiteur 62 pax x 3 (€10,50 pp indicatief)
- Afhuur VOC & materiaal + personeel (4 dagdelen, incl. SBB-afdracht via VOC)
- Boottickets Doeksen 153 pax heen + terug, incl. toeristenbelasting
- Materiaalhuur Bureau Vlieland (biertafelsets, koelkasten, koffiezetapparaat, waterkokers, stretchers, geluidset)
- 15% bureaukosten over het totaal

Elke post krijgt een toelichting met de herkomst van het aantal, zodat je ziet wat nog bevestigd moet worden.

## Programmatijdlijn als onderdelen

De dagtijdlijn uit het draaiboek komt als losse onderdelen in het programma, met tijd en toelichting:

- Dag 0 (ma 14/9, voorbereiding): plaatsing legertent Lange Paal, bagagekarren klaarzetten Harlingen
- Dag 1 (di 15/9): ferry 14:05, fietsen uitreiken 16:00, tenten opzetten, avondeten 18:30 (SM + LP), Pub Quiz 20:00
- Dag 2 (wo 16/9): ontbijt 08:00, VOC bos + VOC strand 09:30-12:00, workshopronde 1 14:00-16:30, avondeten 18:00, touwtrekken/strandspelletjes 19:30-21:30
- Dag 3 (do 17/9): ontbijt 08:00, VOC bos + strand (rouleren) 09:30-12:00, workshopronde 2 14:00-16:30, avondeten 18:00, Theater ODYSSEE 20:00-22:00
- Dag 4 (vr 18/9): opruimen 08:30-10:30, bagage naar haven 09:30, ferry terug 11:50

Partnergekoppelde onderdelen (VOC, Zuiver Traiteur, Stortemelk, Fietsverhuur Jan van Vlieland, Bagagevervoer, Rederij Doeksen) worden aan de juiste partner gekoppeld maar staan op concept met partnernotificatie uitgeschakeld. Staatsbosbeheer/Lange Paal bestaat nog niet als partner in de portal; die regels komen als bureau-post met toelichting.

## Technisch

- Eén `run_sql`-insert in `program_requests` (referentie wordt automatisch BV-2609-000x via de bestaande trigger) plus inserts in `program_request_items`.
- Kostenposten: `day_index = -1`, `block_type = bureau`, `provider_id = bureau`, `price_type = total`, `admin_price_override` gevuld.
- Tijdlijnonderdelen: `day_index` 0-3 (plus voorbereiding op -1 met toelichting, omdat dag 0 buiten de geselecteerde data valt), `preferred_time` gevuld, `status = pending`, `item_quote_status = concept`, `skip_partner_notification = true`, `pending_added = true`.
- Geen wijzigingen in applicatiecode; puur data-invoer.

## Na aanmaken

Ik geef je de link naar het project in admin plus een lijstje van de posten waar nog een prijs of bevestiging op moet.
