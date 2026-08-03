# Bericht naar logiespartner: één thread per logies-aanvraag

Kort antwoord: ja, dat kan al — op de admin-logiespagina staat bij elke offerte een knop **Bericht**, en je kunt ook reageren via het Berichtencentrum. Maar de admin-knop en het paneel dat de partner ziet ("Berichten met Bureau Vlieland" op zijn projectpagina) zoeken de gespreksthread op verschillende manieren op. Daardoor kunnen er twee losse threads ontstaan en zie je elkaars bericht niet altijd op dezelfde plek.

## Wat er nu misgaat

- Het partnerpaneel zoekt het gesprek op **partner + logies-aanvraag** (zonder offerte).
- De admin-sheet zoekt het gesprek op **offerte-id**.
- Gevolg: start de partner het gesprek (offerte-id leeg), dan vindt de admin-sheet die thread niet en maakt een nieuwe aan. Andersom kan de partner meerdere threads door elkaar zien.

## Wat we bouwen

1. **Eén sleutel voor de thread**: het gesprek wordt gevonden/aangemaakt op basis van partner + logies-aanvraag. De offerte-id blijft als extra veld meegaan, maar is niet meer bepalend voor het opzoeken.
2. **Admin-sheet zoekt breder**: eerst zoeken op partner + logies-aanvraag (ongeacht offerte), en alleen als er niets is een nieuwe thread starten. Bestaande partner-threads worden dus overgenomen in plaats van gedupliceerd.
3. **Zichtbaar aanknopingspunt in admin**: naast de per-offerte knop ook een **Bericht aan logiespartner** actie op de aanvraagkaart van de gekozen/aangeschreven partner, zodat je niet eerst de offerte hoeft te openen.
4. **Notificatie blijft werken**: bij een admin-bericht wordt de partner per e-mail geïnformeerd (bestaande notificatie-functie), met de bestaande privacyregels — geen klant-PII in de partnercommunicatie.
5. **Regressietest**: unit-test die vastlegt dat een partner-thread en een admin-bericht op dezelfde logies-aanvraag in één gesprek belanden (geen tweede thread).

## Technisch

- `src/hooks/useAccommodationChat.ts`: lookup omzetten van `quote_id` naar `source_partner_id` + `accommodation_id`, met `quote_id` alleen bij insert.
- `src/hooks/useProjectChat.ts`: gelijk trekken zodat beide hooks dezelfde selectie/ordering gebruiken (nieuwste niet-gesloten thread).
- `src/pages/admin/AdminAccommodationDetail.tsx`: extra "Bericht" actie op partnerniveau; bestaande `AdminAccommodationChatSheet` hergebruiken met optionele `quoteId`.
- `src/components/admin/AdminAccommodationChatSheet.tsx`: `quoteId` optioneel maken.
- Test in `src/lib/__tests__/` op de threadsleutel-logica (helper uitfactoren zodat dit testbaar is zonder netwerk).
