# Roadmap

## Open
- [ ] Logieskeuze fase 2 (plan: `docs/plan-logieskeuze.md`): kamertype koppelen aan de offerte, foto's per offerte, faciliteiten en in-/uitchecktijden in het partnerprofiel, adres geocoderen bij opslaan
- [ ] Logieskeuze fase 3: volledigheidsscore per logiespartner, adminoverzicht wie foto's/tekst mist, partnermailing; optioneel Google Places als basis
- [ ] Logieskeuze fase 4: offertes vergelijken op de kaart
- [ ] Lovable Cloud opruimen (rond 15 september, een week na de overstap): functies `storage-export` en `secrets-export` verwijderen in Lovable, daarna *Remove Lovable Cloud*; in het nieuwe project `storage-export`/`secrets-export` uit de repo halen en via de deploy-workflow verwijderen
- [ ] Storage-bucket `social-media` handmatig verwijderen in het Supabase-dashboard (tabellen en functies zijn al weg)
- [ ] AI: Gemini vervangen door Claude (alleen nog programmasuggesties, factuurscan en verkoop-inbox gebruiken AI)
- [ ] Uitschrijflink in e-mails: nu een dode link; laten hangen tot er een echte uitschrijfpagina is (besluit 8 september)
- [ ] Dagelijkse zelftest (05:45 UTC): eerste automatische run controleren

## Gedaan
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
