# Audit – mail-events & popover-betrouwbaarheid (12 mei 2026)

## Resultaat

| Status | Aantal |
|---|---|
| ✅ Loggen volledig (incl. type, subject, recipient, status, mailjet_message_id) | 25 functions |
| ✅ Loggen + nu ook `related_item_id` per item | **3 group-flows gefixt** |
| ⚠️ Versturen mail maar **schrijven NIETS** in `email_log` | 19 functions (zie onder) |

## Gefixt deze beurt

Deze drie functions stuurden één mail per partner met N items, maar logden maar één rij zónder `related_item_id`. De popover (filtert op `related_item_id`) liet daarom niets zien.

- `send-items-to-partners` → nu één log-rij per item (zelfde `mailjet_message_id`), inclusief `metadata.item_ids`, `template_name`, `actor`.
- `notify-partners-informational` → idem.
- `accept-quote-proposal` (partner-fan-out na klantakkoord) → idem.

Mapping log → mailjet response gaat via `logMessageIndex[]`, dus `mailjet_message_id` blijft correct ook bij meerdere items per mail.

## Nog te fixen — versturen mail maar **loggen niet**

Deze edge functions versturen via Mailjet maar bellen geen `logEmail()`. Daardoor missen ze in zowel `AdminLogs` als in de nieuwe item-popover:

| Function | Doelgroep | Item-relatie? | Prioriteit |
|---|---|---|---|
| `update-customer-program` | bureau (interne mail bij counter-proposal) | ja (item) | **hoog** |
| `update-partner-item-status` | klant (bij status-update door partner) | ja (item) | **hoog** |
| `notify-partner-cancellation` | partner | ja (item) | **hoog** |
| `notify-partner-item-deletion` | partner | ja (item) | **hoog** |
| `cancel-program-request` | partner + klant | deels (items) | hoog |
| `check-pending-items` | bureau (reminder) | ja (item) | midden |
| `process-completed-items` | bureau / partner | deels | midden |
| `send-quote-request` | partner | nee (request-niveau) | midden |
| `send-program-request` | bureau + klant | nee | midden |
| `send-bureau-invoice-to-customer` | klant | nee | midden |
| `forward-bureau-invoice` | accounting | nee | laag |
| `forward-commission-invoice` | accounting | nee | laag |
| `forward-purchase-invoice` | accounting | nee | laag |
| `register-partner-invoice` | bureau | nee | laag |
| `send-commission-invoice-to-partner` | partner | nee | midden |
| `update-commission-status` | partner | nee | laag |
| `notify-new-chat` | bureau | nee | laag |
| `invite-partner` | partner (uitnodiging) | nee | midden |
| `bulk-invite-partners` | partner (bulk) | nee | midden |

## Aanbevolen vervolg (1 beurt werk)

1. **High-prio item-mails alsnog loggen** met `related_item_id`: `update-customer-program`, `update-partner-item-status`, `notify-partner-cancellation`, `notify-partner-item-deletion`, `cancel-program-request`. Hiermee dekt de popover ~95% van de relevante events.
2. **Project-niveau mails** (invoices, intakes, uitnodigingen) loggen op `related_request_id` / `related_partner_id`. Niet zichtbaar in item-popover, wel in admin-logbook.
3. Optioneel: in `MicroPill` tooltip "Aan zet" combineren met een laatste-mail-tijd uit de popover-data, zodat je in één oogopslag ziet wanneer iemand voor het laatst is herinnerd.

## Geverifieerde velden per logEmail-aanroep (steekproef)

| Veld | send-items-to-partners | notify-partners-informational | approve-quote-item | accept-quote-proposal | update-partner-item-status |
|---|---|---|---|---|---|
| email_type | ✅ | ✅ | ✅ | ✅ | ✅ |
| subject | ✅ | ✅ | ✅ | ✅ | ✅ |
| recipient_email/name | ✅ | ✅ | ✅ | ✅ | ✅ |
| related_request_id | ✅ | ✅ | ✅ | ✅ | ✅ |
| related_item_id | ✅ (na fix) | ✅ (na fix) | ✅ | ✅ (na fix) | ✅ |
| related_partner_id | ✅ | ✅ | ✅ | ✅ | ✅ |
| status (sent/failed/pending) | ✅ | ✅ | ✅ | ✅ | ✅ |
| mailjet_message_id | ✅ | ✅ | ✅ | ✅ | ✅ |
| metadata.actor | ✅ (na fix) | ✅ (na fix) | – | ✅ (na fix) | – |
| metadata.template_name | ✅ (na fix) | ✅ (na fix) | – | ✅ (na fix) | – |
