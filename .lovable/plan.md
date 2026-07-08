## Doel

Twee dingen die je vandaag mist: (1) elke uitgaande mail is traceerbaar tot delivery/open/click/bounce en (2) je hebt één plek om in te zien of alles goed loopt. Na dit plan geldt: als een mail eruit gaat en er komt geen feedback → dat zie je in het dashboard, niet pas als een klant belt.

## Fase 1 — Gaten dichten in edge functions

**Probleem in cijfers**: 32 edge functions roepen Mailjet aan zonder de response-`MessageID` te loggen. Zolang die ontbreekt, kunnen webhook-events die mail nooit terugkoppelen — open/click/bounce zijn dan blind.

**Wat er gebeurt**:

1. Nieuwe helper `_shared/mailjet-send.ts` die de Mailjet-call maakt, MessageID uit de response haalt en teruggeeft aan de caller. Alle logic op één plek: retry, error-parsing, MessageID-extractie.
2. Alle 32 functions omzetten naar deze helper. Per function:
   - Response parsen, MessageID extraheren (`response.Messages[0].To[0].MessageID`).
   - `logEmail()` aanroepen met `mailjet_message_id`, `template_name`, `actor`, `status`, en bij fail met `error_message`.
   - Loggen bij zowel succes als fail (contract uit `_shared/EMAIL_LOGGING.md`).
3. Nieuwe repo-test `_shared/email-logger.test.ts` uitbreiden: regex-scan die faalt in CI wanneer een edge function `api.mailjet.com` aanroept zonder `mailjet_message_id` in een `logEmail()`-call binnen dezelfde file. Voorkomt terugval.
4. Deploy alle aangeraakte functions.

**Verificatie**:
- Query op `email_log` na deploy: aandeel `status='sent' AND mailjet_message_id IS NULL` moet naar ~0 dalen voor nieuwe rijen.
- Handmatige steekproef: één test-send per gewijzigde function categorie → controleren dat de rij nu een MessageID heeft.

## Fase 2 — /admin/email-health dashboard

Alleen zichtbaar voor admin-rol (bestaande `has_role`-guard). Nieuwe pagina + route in bestaande admin-navigatie.

**Componenten**:

1. **KPI-tegels (bovenaan)** met filter Laatste 24u / 7d / 30d:
   - Verzonden (unieke `mailjet_message_id`).
   - Bezorgd / Geopend / Geklikt (percentage én absoluut).
   - Bounced / Blocked / Spam.
   - Failed (geen MessageID of expliciete fout).
   - **Verdachte mails**: `status='sent'` ouder dan 24u zonder `delivered_at` — dat is de meest bruikbare early-warning.
2. **Verdachte mails-tabel** (default open): welke templates/ontvangers zitten vast in `sent`. Kolommen: template, ontvanger, tijdstip, laatste bekende status, knop "Details" (opent bestaande `ItemEmailLogPopover`-achtige detail).
3. **Per-template overzicht**: tabel gegroepeerd op `email_type` met counts per status + deliverability% + gemiddelde tijd tot open. Sortable.
4. **Recente webhook-events**: laatste 20 rijen uit `email_log.mailjet_events` (JSON) — laat zien dat de webhook echt binnenkomt. Bij 0 events in 24u: rode banner "Geen webhook-events ontvangen — controleer Mailjet configuratie".
5. **Zoekbalk** op ontvanger-email.

**Data**: alles via de bestaande `email_log`-tabel. Geen schemawijzigingen. Query's dedupliceren op `mailjet_message_id` (of `id` bij ontbrekende MessageID).

**Route**: `/admin/email-health` — link in bestaande admin-sidebar naast Logs.

## Fase 3 — Documentatie (klein)

- `.lovable/audit-email-logging.md` bijwerken zodat de lijst met "loggen niet"-functions leeg is.
- `_shared/EMAIL_LOGGING.md` uitbreiden met de nieuwe helper als verplicht patroon.

## Buiten scope (bewust)

- **Automatische alerts per mail** (dat was optie 3). Kan als je na 1 week gebruik van het dashboard nog gaten voelt.
- **Resend-knop per gefaalde mail**: `useResendEmail`-hook bestaat al voor sommige types; niet uitbreiden in deze ronde.
- **Backfill** van oude "sent zonder MessageID"-rijen: onmogelijk, Mailjet heeft die koppeling niet meer.
- **Bounce-anomaliedetectie** (0 bounces in 14 dagen is verdacht) — het dashboard maakt dit zichtbaar; verder ingrijpen alleen als het na live-observatie een probleem blijkt.

## Volgorde & schatting

1. Helper + eerste 5 kritieke functions (`send-bureau-invoice-to-customer`, `send-quote-offer`-achtigen, `send-accommodation-quote-request`, `send-program-request`, `send-partner-mailing`) + repo-guard test → 1 build.
2. Overige 27 functions in batch → 1 build.
3. Dashboard → 1 build.

Ik doe stap 1 als eerste zodat je binnen één beurt al kunt zien dat de belangrijkste klantfacing mails weer trackbaar zijn, voordat ik aan de long tail begin.
