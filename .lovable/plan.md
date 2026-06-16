
## Probleem

Bij het annuleren van een project worden logies-partners die een offerte­aanvraag hebben ontvangen niet geïnformeerd. Hun quote wordt stilletjes op `rejected` gezet door `notify-partner-cancellation`, zonder mail. Activiteiten­partners worden alleen gemaild als het item geen `bureau`-item is en niet `skip_partner_notification=true` is — dat klopt (zij hebben dan ook geen aanvraag­mail ontvangen).

## Retro-overzicht Deloitte (BV-2605-0004)

Op basis van `email_log` zijn dit de partijen die destijds een aanvraag hebben binnen­gekregen en dus alsnog een annulerings­mail zouden moeten krijgen:

- **Badhotel Bruin** — `receptie@badhotelbruin.com` (offerte­aanvraag 02-06-2026)
- **Hotel Zeezicht Vlieland** — `manager@zeezichtvlieland.nl` (offerte­aanvraag 02-06-2026)

Geen activiteiten­partners: alle 11 programma-onderdelen waren `block_type=bureau` met `skip_partner_notification=true`. Die hebben nooit een aanvraag­mail ontvangen, dus krijgen ook geen annulering (conform jouw regel "die de aanvraag binnen hebben gekregen").

## Wijziging

### 1. Edge function `notify-partner-cancellation` uitbreiden

Vóór het op `rejected` zetten van openstaande logies-offertes: capture de lijst van partners met een quote in `pending` / `submitted` / `selected` / `accepted`. Voor elke partner één mail sturen met:

- Aanhef + referentie­nummer
- Korte mededeling dat de aanvraag is geannuleerd en de offerte komt te vervallen
- Eventueel quote-status ("uw offerte was nog in behandeling" / "uw offerte was reeds geselecteerd")
- Standaard afsluiting

Gebruik bestaande template­infrastructuur (`getRenderedTemplate`) met nieuwe template­naam `cancellation_accommodation_partner` als fallback naar inline HTML, zoals nu voor `cancellation_partner` ook gebeurt. Log per quote één rij in `email_log` (type `cancellation_accommodation_partner`, `related_partner_id`, `related_request_id` = programma-id, plus `metadata.accommodation_request_id` en `quote_id`). Ook één regel in `project_communications` voor het dossier.

Pas daarna pas de `status='rejected'` update toe (huidige gedrag blijft).

### 2. Activiteiten­partners — geen wijziging

Huidige filter (`!isBureauItem` && `block_type !== 'self_arranged'`) blijft. Items met `skip_partner_notification=true` zonder `customer_approved_at` worden ook nu al niet gemaild (correct: nooit verstuurd → geen annulering).

### 3. Retroactief Deloitte

Eenmalig handmatig de uitgebreide edge function aanroepen met `request_id=dec4c24c-…` zodra deze gedeployed is, óf via een eenmalig admin-knopje. **Vraag:** ik stel voor om hiervoor géén losse UI-knop te maken, maar de mails eenmalig te triggeren via een directe `supabase.functions.invoke` (vanuit een test-call) na deploy. Akkoord?

## Technische details

- Bestand: `supabase/functions/notify-partner-cancellation/index.ts`
- Nieuwe sectie vóór de huidige `accommodation_quotes` update, identieke email-loop-structuur als bestaande partner­loop
- Mail-onderwerp: `Aanvraag {ref} is geannuleerd` (zelfde stijl)
- Body kort en formeel — geen klant-PII behalve referentie­nummer
- Reply-To via `buildReplyTo(refNumber)` zodat antwoorden in het dossier landen
- Logging: `template_name: "cancellation_accommodation_partner"`, `actor: "admin → logies-partner (project geannuleerd)"`

## Uit scope

- Geen wijziging aan de activiteiten-filter
- Geen wijziging aan klant- of interne-mail
- Geen nieuwe UI-elementen
