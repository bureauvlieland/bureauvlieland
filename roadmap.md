# Roadmap

## Actueel
- [x] Social-media-planner verwijderen (wordt niet gebruikt): functies social-*, tabellen social_posts/social_media_assets/social_settings, admin-pagina's /admin/social*, Meta-koppeling en secrets META_APP_ID/META_APP_SECRET (genoteerd 8 september)
- [ ] Audit e-mailteksten en gegenereerde links (klantpagina, partnerpagina, chat): inhoud nalopen per template, elke link controleren op basis-URL, token en route; fixen waar nodig (groot, belangrijk; genoteerd 8 september)
- [x] WhatsApp-antwoorden nooit verliezen bij een externe verzendfout
- [x] Twilio-accountblokkades begrijpelijk tonen en met gedragstests afdekken
- [x] Test- en betrouwbaarheidsaudit vertalen naar concrete kritieke-ketenchecks
- [x] Klantgoedkeuring alleen voor nieuwe onderdelen (wijzigingen = melding, geen reset)
- [x] Badge "Wacht op bevestiging aanbieder" amber i.p.v. groen
- [x] Losse facturabele kosten (day_index -1) niet als goed te keuren programmaonderdeel tonen
- [x] Tests voor bovenstaande gedragingen
- [x] Mailjet-webhook opnieuw geregistreerd op eigen account; vreemd verkeer apart geteld (foreign_account)
