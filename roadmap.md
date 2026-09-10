# Roadmap

## Open
- [ ] Concurrentiepositie scherper communiceren (`docs/concurrentie-positionering.md`, 10 september): punt 1 (zelfbedieningsvoordeel) en punt 2 (SEO-check, 3 van de 12 pagina's aangevuld) gedaan — nog open: dezelfde regel eventueel ook op de resterende 4 dunnere landingspagina's, en punt 3 (reviews zichtbaarder/talrijker maken, geen bouwtaak)
- [ ] Frontend usability en conversie (`docs/plan-frontend-usability.md`, volgorde akkoord 10 september): 6) meten per landingspagina (fase 3, GA4-export van Erwin binnen, nog te verwerken)
- [ ] Partnerprofielen vullen: herinnering sturen vanuit *Content → Partnerprofielen* (logies én activiteiten) en de basis van de belangrijkste partners zelf invullen via "Open als partner" (13 van de 14 zijn leeg)
- [ ] Lovable Cloud opruimen (rond 15 september, een week na de overstap, ná het omzetten van visitvlieland.nl): functies `storage-export` en `secrets-export` verwijderen in Lovable, daarna *Remove Lovable Cloud*; in het nieuwe project `storage-export`/`secrets-export` uit de repo halen en via de deploy-workflow verwijderen
- [ ] Storage-bucket `social-media` handmatig verwijderen in het Supabase-dashboard (tabellen en functies zijn al weg)
- [ ] Uitschrijflink in e-mails: nu een dode link; laten hangen tot er een echte uitschrijfpagina is (besluit 8 september)
- [ ] Dagelijkse zelftest (05:45 UTC): eerste automatische run controleren

## Gedaan
- [x] Logieskeuze fase 4: offertes vergelijken op de kaart (10 september): bij 2 of meer ontvangen offertes en minstens één aanbieder met bekende coördinaten verschijnt een lijst/kaart-schakelaar boven de offertes; de kaart (`AccommodationQuotesMap`, zelfde Leaflet-patroon als de bestaande programma-kaart) toont een pin per aanbieder met prijs in de popup en een link die naar de bijbehorende offertekaart springt. Aanbieders zonder coördinaten staan als lijst onder de kaart
- [x] Concurrentiepositie: zelfbedieningsvoordeel en SEO-check (10 september): korte regel toegevoegd onder de intro van de homepage-`RoutePicker` ("geen offerte-aanvraag nodig om te zien wat mogelijk is"); alle 12 bedrijfsuitje/event-landingspagina's gecontroleerd op Vlieland-exclusiviteitsframing — 5 hadden dit al, bij de 3 met naar verwachting het meeste verkeer (`bedrijfsuitje-ideeen`, `zakelijk-evenement`, `heisessie`) een korte regel toegevoegd, zie `docs/concurrentie-positionering.md`
- [x] Logies als stap in de programma-wizard (10 september): nieuwe, overslaanbare stap "Logies" tussen Basisgegevens en Vervoer & fietsen — compact (type verblijf, locatie, budget), geen kamerverdeling. Loste een echt gat op: de bestaande logiesflow stond los van de wizard (een koppelbanner bleek nergens gerenderd), klanten zagen logies pas ná het versturen op hun klantpagina. Een ingevulde logieswens wordt nu direct bij het versturen gekoppeld aangemaakt
- [x] Inline formuliervalidatie op Offerte en Programma-samenstellen (10 september): `Offerte.tsx` (react-hook-form + zod) valideert nu bij het verlaten van een veld (`mode: "onBlur"`) i.p.v. pas bij versturen; `CheckoutContactForm.tsx` (geen formulierbibliotheek, gebruikt door Programma-samenstellen én Snel-aanvragen) had alleen een leeg-check, nu ook formaatcontrole op e-mail en telefoon met foutmeldingen die verschijnen na het verlaten van het veld en meteen verdwijnen bij correctie
- [x] CTA-hiërarchie Snel-aanvragen/Programma-samenstellen (10 september): bouwstenen-hero, bouwstenen-kaart en activiteitpagina hadden nog "Direct aanvragen" en "Aan programma toevoegen" als twee gelijkwaardige knoppen; nu overal "Aan programma toevoegen" als primaire actie, "Direct aanvragen" als onderschikte link
- [x] Voorbeeldprogramma's verwezen naar verkeerde bouwsteen (10 september): 6 van de 7 gepubliceerde voorbeeldprogramma's koppelden naar de individuele "Zeehondentocht" (nu los boekbaar via MAP) in plaats van de bedoelde "Zeehondentocht Exclusief" (privéafvaart voor de hele groep) — precies de verwarring die deze hele frontend-usability-ronde probeert te voorkomen. Alle 7 gecorrigeerd naar de exclusief-variant
- [x] Voorbeeldprogramma's als vierde kaart in de homepage-`RoutePicker` (10 september): eerder alleen een klein tekstlinkje, nu een volwaardige kaart naast de andere hoofdroutes ("Voorbeeldprogramma's bekijken", ± 2 min)
- [x] Staffelprijzen in het partnerportaal (10 september): `TierEditor` uit het adminscherm hergebruikt in `PartnerBlockSheet.tsx`, partners kunnen nu zelf staffels per groepsgrootte instellen op eigen bouwstenen; activiteitenlijst toont "vanaf €… (staffel)"
- [x] Footer-overlap door zwevende knoppen (10 september): "Uw programma", de verstuur-balk op Programma-samenstellen en "Vraag stellen" verdwijnen nu zodra de footer in beeld komt (nieuwe hook `useFooterInView`), zodat ze niet meer over de footer-links heen staan
- [x] Horizontale scroll op /partner/aanbod, nieuwe plek (10 september): `BlockRow` in `PartnerBlocks.tsx` had dezelfde niet-wrappende badges/knop-rij als de eerder gefixte MAP-koppelrij; stapelt nu op mobiel
- [x] Frontend usability fase 1, duplicate-submits (9 september): race-conditie in `CheckoutContactForm` gefixt — de knop vergrendelde pas ná de dedup-checks in plaats van ervoor, waardoor een snelle tweede klik er soms toch doorheen kwam. Van de 4 vermeende dubbele aanvragen sinds juni waren er 2 echt een dubbelklik, de andere 2 waren gewoon twee verschillende aanvragen van dezelfde klant
- [x] Wadloopexcursie en de rondleiding bij Brouwerij Fortuna zelf gekoppeld aan hun MAP-activiteit (9 september, door Erwin)
- [x] Bouwstenen-kaart: "Direct aanvragen" niet meer even zwaar naast "Direct reserveren" bij direct boekbare activiteiten (9 september), na twee aanvragen deze week voor een activiteit die al direct te boeken was; horizontale scroll bij lange activiteitsnamen in "Mijn aanbod" definitief opgelost — zie `docs/plan-frontend-usability.md`
- [x] AI van Gemini naar Claude (9 september): alle AI-functies lopen via claude-opus-5 zodra ANTHROPIC_API_KEY er is, Gemini als terugval; e-mailhulp live getest
- [x] Activiteitenaanbieders fase 3, MAP-koppeling (8 september): bouwstenen met gekoppeld MAP-activiteitstype volgen 's nachts foto, tekst en duur (prijs per bouwsteen aan te zetten), knop "Nu bijwerken uit MAP" in admin, beschikbaarheid per dag op de klantkaart
- [ ] MAP: de 7 MAP-aanbieders hun activiteiten laten aanbieden via *Mijn aanbod → Uw activiteiten in MijnActiviteitenplanner* (of zelf koppelen via admin → Bouwstenen → MAP-activiteit kiezen); daarna eerste nachtelijke run controleren
- [x] Activiteitenaanbieders fase 1 en 2 (8 september): activiteitenkaart bij de klant met grotere foto, duur, groepsgrootte, ligging en blok "Over de aanbieder"; adminoverzicht Partnerprofielen met tabbladen logies/activiteiten en herinneringsmailing per groep
- [x] Visitvlieland.nl omgezet naar de nieuwe database (8 september); leest `partners_public` voor logies en activiteitenaanbieders met MAP-omgeving
- [x] Logieskeuze fase 3 (8 september): volledigheidsscore uitgebreid voor logiespartners (faciliteiten, tijden, kamertypes met foto's), adminoverzicht Logiesprofielen met herinneringsmailing per partner; Google Places-import afgewezen vanwege de voorwaarden
- [x] Logieskeuze fase 2 (8 september): kamertype met foto's en faciliteiten gekoppeld aan de offerte, eigen foto's per offerte, faciliteiten en in-/uitchecktijden in het partnerprofiel met wensenvergelijking op de klantkaart, afstand tot boot en dorp, coördinaten opzoeken op adres
- [x] Overstap van Lovable Cloud naar eigen Supabase-project (8 september): database, 249 bestanden, 41 gebruikers, 19 secrets, cron, Mailjet- en Twilio-webhooks, Netlify
- [x] Deploy-workflow aan: edge functions en migraties gaan mee bij elke merge naar `main`; vaste CLI-versie na "rate limit exceeded"
- [x] Claudia (AI-assistent) en OpenAI-koppeling verwijderd (8 september)
- [x] Audit e-mailteksten en gegenereerde links, twee rondes (8 september): kapotte `/logies/`-links, [TEST]-voorvoegsel, oud telefoonnummer, ontbrekende placeholders, zes dode templates, herinneringen na 7 dagen, bureaumeldingen naar de instelling "Administratie email", aparte deelnemerscode voor de gedeelde programmapagina
- [x] Social-media-planner verwijderd (8 september): functies, tabellen, adminpagina's, Meta-koppeling
- [x] Praktische info van de klantpagina (gastenlijst, dieet, kamers/verzorging, kamerindeling, facturatie, opmerkingen per onderdeel) zichtbaar bij partner en admin, met Werkbank-taak bij wijziging (8 september)
- [x] Bug: bij het kiezen van een logiesofferte gingen handtekening en akkoord voorwaarden niet mee (8 september)
- [x] Logieskeuze fase 1 (8 september): keuzekaart met foto's, ligging, kamers, verzorging en extra's; detailvenster met galerij en kaart; wensenbalk; coördinatenfout Zeezicht hersteld met bereikcontrole
- [x] Partnertrigger `protect_partner_self_update_fields` verwees nog naar de verwijderde kolom `initial_password` (8 september)
- [x] WhatsApp-antwoorden nooit verliezen bij een externe verzendfout
- [x] Twilio-accountblokkades begrijpelijk tonen en met gedragstests afdekken
- [x] Test- en betrouwbaarheidsaudit vertalen naar concrete kritieke-ketenchecks
- [x] Klantgoedkeuring alleen voor nieuwe onderdelen (wijzigingen = melding, geen reset)
- [x] Badge "Wacht op bevestiging aanbieder" amber i.p.v. groen
- [x] Losse facturabele kosten (day_index -1) niet als goed te keuren programmaonderdeel tonen
- [x] Tests voor bovenstaande gedragingen
- [x] Mailjet-webhook opnieuw geregistreerd op eigen account; vreemd verkeer apart geteld (foreign_account)
