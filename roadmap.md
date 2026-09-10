# Roadmap

## Open
- [ ] Frontend usability en conversie (`docs/plan-frontend-usability.md`, voorstel volgorde 10 september, wacht op akkoord): 1) staffelprijzen in partnerportaal (`TierEditor` hergebruiken in `PartnerBlockSheet`), 2) voorbeeldprogramma's als vierde kaart in de homepage-`RoutePicker`, 3) CTA-hiërarchie Snel-aanvragen/Programma-samenstellen, 4) inline formuliervalidatie, 5) logies als stap in de wizard (fase 2, eigen planningsronde), 6) meten per landingspagina (fase 3, wacht op GA4-export)
- [ ] Partnerprofielen vullen: herinnering sturen vanuit *Content → Partnerprofielen* (logies én activiteiten) en de basis van de belangrijkste partners zelf invullen via "Open als partner" (13 van de 14 zijn leeg)
- [ ] Logieskeuze fase 4: offertes vergelijken op de kaart
- [ ] Lovable Cloud opruimen (rond 15 september, een week na de overstap, ná het omzetten van visitvlieland.nl): functies `storage-export` en `secrets-export` verwijderen in Lovable, daarna *Remove Lovable Cloud*; in het nieuwe project `storage-export`/`secrets-export` uit de repo halen en via de deploy-workflow verwijderen
- [ ] Storage-bucket `social-media` handmatig verwijderen in het Supabase-dashboard (tabellen en functies zijn al weg)
- [ ] Uitschrijflink in e-mails: nu een dode link; laten hangen tot er een echte uitschrijfpagina is (besluit 8 september)
- [ ] Dagelijkse zelftest (05:45 UTC): eerste automatische run controleren

## Gedaan
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
