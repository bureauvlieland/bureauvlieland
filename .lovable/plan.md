## Doel
De 72 actie-gerichte e-mails zonder `mailjet_message_id` (op actieve projecten met toekomstige startdatum) opnieuw versturen, nadat we zeker weten dat de fix in de edge functions werkt.

## Fase 1 — Fix parsing in edge functions
Corrigeer het uitlezen van Mailjet's response in alle betrokken functies. De juiste pad is `result.Messages[i].To[0].MessageID`, niet `result.Messages[i].MessageID`.

Te fixen functies (op basis van eerdere audit):
- `send-items-to-partners`
- `accept-quote-proposal`
- `send-accommodation-quote-request`
- `send-accommodation-selected`
- `send-counter-proposal`
- `notify-partner-cancellation`
- `send-quote-offer`
- (en overige die via `sendEmailViaMailjet` een `logEmail` doen zonder message_id te capturen)

Per functie: capture `mailjet_message_id` vóór `logEmail`, en zet `status: "failed"` als Mailjet geen MessageID teruggeeft.

Deploy alle gefixte functies.

## Fase 2 — UI badges
In `PartnerNotificationsCard.tsx` en `ItemEmailLogPopover.tsx` (en overige plekken die email-status tonen):
- **Groen "Afgeleverd"**: `delivered_at` gezet.
- **Blauw "Verzonden"**: `mailjet_message_id` aanwezig, geen `delivered_at`.
- **Amber "Verzonden (geen bevestiging)"**: `status='sent'` maar geen `mailjet_message_id` (of ouder dan 15 min zonder delivery).
- **Rood "Mislukt"**: `status='failed'`.

## Fase 3 — Testverzending
Eén test-mail sturen naar Erwin's adres via een van de gefixte functies, en verifiëren:
1. `mailjet_message_id` staat in `email_log`.
2. Delivery webhook zet `delivered_at`.
3. Badge in UI wordt correct groen.

Pas doorgaan met Fase 4 als deze drie punten kloppen.

## Fase 4 — Bulk resend van 72 mails
Nieuwe edge function `bulk-resend-unconfirmed`:
- Query: `email_log` rows waar `mailjet_message_id IS NULL` én project actief én startdatum in de toekomst én `email_type` in de actie-lijst (program_request_*, quote_request_*, accommodation_quote_request_partner, counter_proposal_partner, accommodation_selected_*, cancellation_*).
- **Dry-run modus** (default): geeft lijst terug van {recipient, email_type, project, sent_at} zonder te versturen.
- **Execute modus**: hergebruikt de bestaande `resend-email` functie per row, met 500ms delay tussen sends (rate limiting).
- Elke resend logt een nieuwe `email_log` row met `metadata.bulk_resend_batch_id` zodat we ze kunnen tracken/terugdraaien.
- Admin-only, auth check via `is_admin`.

Ik voer eerst dry-run uit, laat je de lijst zien voor akkoord, en dan pas execute.

## Fase 5 — Verificatie
Na bulk resend:
- Query hoeveel van de 72 nu een `mailjet_message_id` hebben.
- Na ~15 min: hoeveel `delivered_at` hebben.
- Rapport terug naar jou.

## Technische details
- Geen schema-wijzigingen nodig; `email_log` heeft al alle benodigde velden.
- `bulk-resend-unconfirmed` in `supabase/functions/`, verify_jwt=false + in-code admin check.
- Rate limit: 500ms per send = ~36s voor 72 mails, ruim onder Mailjet's rate limits.
- Dubbele-mail risico geaccepteerd (kleine kans dat ontvanger 'm nu tweede keer krijgt).
