## Probleem

Voor BV-2606-0022 is het project nog in de **goedkeuring-door-klant** fase. Toch krijgt Vliehors Expres een T-7 herinnering "Reactie nodig". Dat klopt op twee niveaus niet:

1. **Principe**: zolang de klant het project (of het specifieke onderdeel) nog niet heeft goedgekeurd, mag er sowieso niets naar de partner — niet als initiële aanvraag, niet als herinnering. Alleen een handmatige admin-actie mag dat doorbreken.
2. **Bug**: `check-pending-items` (T-7/T-3) filtert nu niet op klant-goedkeuring en niet op `skip_partner_notification`, en checkt ook niet of de originele aanvraag ooit verzonden is. Daardoor gaan er "ghost-herinneringen" naar partners die nooit iets ontvangen hebben.

DB bevestigt: beide Vliehors-items (`6895cc71…`, `026ea1e6…`) hebben `skip_partner_notification = true` én geen `customer_approved_at`, maar in `email_log` staat wel een `partner_activity_unconfirmed_t7` naar info@vliehors-expres.nl.

## Plan

### 1. Reminder-cron hardenen — `supabase/functions/check-pending-items/index.ts`

In de T-7 én T-3 loop (regel ~1073-1140) een driedubbel filter toevoegen vóór elke partner-mail:

- **Skip als `skip_partner_notification = true`** — admin heeft expliciet aangegeven dat dit item nog niet de deur uit mag.
- **Skip als klant nog niet heeft goedgekeurd én project staat in `concept` / `in_afstemming` / `offerte_verstuurd`** — zolang de klant niet akkoord is, mag een partner geen druk/herinnering krijgen. Pas vanaf `akkoord_ontvangen` (of `customer_approved_at` op het item) gaan reminders lopen.
- **Skip als er nooit een initiële `partner_request_*`-mail in `email_log` voor `related_item_id = item.id` staat** — extra vangnet tegen ghost-reminders, ook voor historische data.

Bij elke skip een korte `console.log` met reden zodat we het in de edge-function logs kunnen terugzien.

### 2. Eenmalig herstel BV-2606-0022

De twee Vliehors-items en, ter check, alle andere items in dit project waar al een T-7 is uitgegaan terwijl de klant nog niet akkoord is: status terugzetten naar correcte staat, `skip_partner_notification` laten staan op `true`. Geen retroactieve mail naar Vliehors — admin beslist zelf of/wanneer de aanvraag alsnog verstuurd wordt.

### 3. Antwoord aan Petra (concept)

> Hoi Petra, je hebt gelijk en het spijt me. Deze herinnering had je niet moeten krijgen — het project zit nog in de fase waarin de klant het programma moet goedkeuren, dus de aanvraag was nog niet officieel jouw kant op gegaan. Door een fout in onze automatische herinneringen ging de T-7 mail wél de deur uit. Ik heb dat nu gerepareerd: herinneringen worden voortaan pas verstuurd zodra de klant akkoord is en de aanvraag echt naar jou is uitgegaan. Zodra de klant akkoord is op het programma stuur ik je de officiële aanvraag voor de Vliehors Expres + lunch toe.

## Verificatie

- `supabase--read_query` op `email_log` om te bevestigen dat na de fix geen `partner_activity_unconfirmed_t7` / `partner_briefing_t3` rijen meer ontstaan voor items zonder `customer_approved_at` of met `skip_partner_notification = true`.
- Bestaande regressietests in `src/lib/__tests__/itemStatus.test.ts` blijven groen (geen statuslogica gewijzigd, alleen reminder-trigger).

## Niet in scope

- Geen wijziging aan `send-items-to-partners` of admin-UI: handmatig versturen blijft werken zoals nu.
- Geen schema-wijzigingen.
- Klant-annulering-flow ongewijzigd (al opgelost in vorige turn).
