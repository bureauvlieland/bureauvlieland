## Probleem

`mailjet-event-webhook` gebruikt sinds de vorige "fix" `.order(created_at desc).limit(1)` om de `.maybeSingle()`-crash bij dubbele `mailjet_message_id`'s te vermijden. Dat lost de crash op, maar zorgt ervoor dat bij group-mails (één Mailjet-send → meerdere `email_log`-rijen, één per item, zie `.lovable/audit-email-logging.md` en het contract in `_shared/EMAIL_LOGGING.md`) maar één rij het open/click/delivery-event krijgt. De rest blijft leeg.

Verificatie in de DB: meerdere `mailjet_message_id`'s hebben 2–8 rijen (5 message-ID's hebben er zelfs elk 8). Dat matcht exact het group-mail patroon van `send-items-to-partners`, `notify-partners-informational` en `accept-quote-proposal`.

## Oplossing

`mailjet-event-webhook/index.ts` aanpassen zodat elk binnenkomend Mailjet-event **alle** rijen met dezelfde `mailjet_message_id` bijwerkt, niet alleen de laatste:

1. Lookup: `.select(...).eq("mailjet_message_id", messageId)` **zonder** `.limit(1)` — alle matches ophalen.
2. Voor elke matchende rij:
   - `mailjet_events` aanvullen (append event-object).
   - Per-event timestamp (`delivered_at`/`opened_at`/…) alleen zetten als hij nog leeg is (blijft per-rij correct).
   - `open_count` / `click_count` per rij verhogen.
   - `status` alleen promoveren als de nieuwe status "sterker" is dan de huidige status van die rij (`STATUS_RANK` blijft per-rij vergeleken).
   - `error_message` zetten bij bounce/blocked.
3. Updates in één `.in("id", [ids])`-batch waar de update-payload identiek is (append + counters kunnen dat niet, dus per rij updaten in een `Promise.all`).
4. `processed` verhoogt met het aantal daadwerkelijk bijgewerkte rijen, zodat de response inzichtelijk blijft.
5. Alle bestaande gedragingen behouden: token-guard, CORS, `unmatched`-telling wanneer geen enkele rij matcht, logging bij fetch/update errors.

## Verificatie na de fix

- Query vooraf/na: aantal rijen met `opened_at IS NULL` maar `status IN ('sent','delivered')` voor recente group-mails.
- Log-check op `mailjet-event-webhook`: geen fetch/update-errors, `processed` > 1 bij group-mail events.
- Steekproef op één bekende dubbele `mailjet_message_id` (bijv. `1152921542493665000`, 8 rijen): na een open/click event op die send moeten alle 8 rijen hun `opened_at`/`open_count` bijgewerkt hebben.

## Buiten scope

- Geen wijziging aan `logEmail()` of aan de group-mail edge functions — die schrijven bewust N rijen met dezelfde `mailjet_message_id`, dat is het contract dat de popover gebruikt.
- Geen backfill van gemiste opens/clicks uit het verleden (Mailjet stuurt events niet opnieuw). Wel documenteren in de PR-samenvatting.
