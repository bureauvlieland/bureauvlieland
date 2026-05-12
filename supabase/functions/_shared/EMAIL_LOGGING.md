# E-mail logging contract

Elke edge function die transactionele e-mail verstuurt **moet** elke send
loggen via `logEmail()` uit `_shared/email-logger.ts`. Dit voedt onder
andere de e-mail-popover in het admin- en partnerportaal en het
communicatie-dossier per project.

## Verplichte velden

`logEmail(entry)` valideert het volgende synchronously vóór de DB-insert.
Ontbreken/leeg ⇒ er wordt een `EmailLogValidationError` gegooid en de
edge function valt hard om (geen stille incomplete rows).

| Veld | Type | Verplicht | Toelichting |
| --- | --- | --- | --- |
| `email_type` | `string` | ✅ | Gebruik bij voorkeur een constante uit `EmailTypes`. |
| `subject` | `string` | ✅ | Onderwerp zoals daadwerkelijk verzonden. |
| `recipient_email` | `string` | ✅ | Ontvanger ná `getRecipientEmail()` (test-mode rerouting). |
| `status` | `"sent" \| "failed" \| "pending"` | ✅ | |
| `sent_by` | `string` | ✅ | Identifier van het systeem of de actor (`system`, `admin:<uid>`, `customer:<email>`, `partner:<id>`). |
| `metadata.template_name` | `string` (non-empty) | ✅ | Machine-leesbare template-id. Bij voorkeur gelijk aan `email_type` of de `EmailTypes`/`TemplateIds`-constante. |
| `metadata.actor` | `string` (non-empty) | ✅ | Mens-leesbare beschrijving van de afzendrelatie, b.v. `"admin → partner"`, `"klant → bureau"`, `"system → klant (logies bevestigd)"`. |

## Aanbevolen velden (waar relevant)

- `recipient_name`
- `related_request_id` — koppel aan `program_requests.id`
- `related_accommodation_id` — koppel aan `accommodation_requests.id`
- `related_partner_id` — koppel aan `partners.id`
- `related_item_id` — koppel aan `program_request_items.id` voor item-mails
- `mailjet_message_id` — uit Mailjet-response, voor cross-referentie
- `error_message` — alleen bij `status: "failed"`

Bij batch/group-mails (één Mailjet-call → meerdere items): zet
`metadata.item_ids: string[]`. De popover valt hier op terug via een
`contains`-query op `metadata`.

## Conventies voor `actor`

Gebruik een korte, consistente Nederlandse beschrijving in de vorm
`"<initiator> → <ontvanger> (<context>)"`. Voorbeelden in gebruik:

| Use case | `actor` |
| --- | --- |
| Admin verstuurt items naar partner | `"admin → partner"` |
| Systeem verstuurt na klantakkoord | `"system → partner (na klantakkoord)"` |
| Informatieve mededeling aan partner | `"admin → partner (informatief)"` |
| Klant accepteert offerte | `"klant → bureau (akkoord bevestiging)"` |
| Bevestiging logies aan klant | `"system → klant (logies bevestigd)"` |
| Prijswijziging | `"admin → klant (prijswijziging)"` / `"admin → partner (prijswijziging)"` |
| Annulering | `"admin → partner (annulering)"` |
| Wachtwoord reset | `"partner → self (wachtwoord reset)"` |
| Inbound parse → klant | `"partner → klant (via inbound parse)"` |
| Resend door admin | `"admin → resend"` |
| Bulk mailing | `"admin → partner (bulk mailing)"` |

Houd `actor` kort en neutraal — geen PII.

## Patroon

```ts
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

await logEmail({
  email_type: EmailTypes.PROGRAM_REQUEST_PARTNER,
  subject: fullSubject,
  recipient_email: recipientEmail,
  recipient_name: partner.name,
  related_request_id: program.id,
  related_partner_id: partner.id,
  related_item_id: item.id,
  status: mailjetResponse.ok ? "sent" : "failed",
  error_message: mailjetResponse.ok ? undefined : JSON.stringify(mjResult),
  mailjet_message_id: messageId ?? undefined,
  sent_by: "system",
  metadata: {
    template_name: EmailTypes.PROGRAM_REQUEST_PARTNER,
    actor: "system → partner (na klantakkoord)",
    // …extra context (item_ids, test_mode, reason, …)
  },
});
```

> ⚠️ Log **bij elke uitkomst** (success én failure). Faalpaden krijgen
> dezelfde `template_name`/`actor` plus `failure: true` in metadata, zodat
> de popover en analytics consistent blijven.

## Validatie & verificatie

- Runtime: `logEmail()` gooit `EmailLogValidationError` bij ontbrekende
  `template_name`/`actor`. De function eindigt met een 5xx-error in plaats
  van een stille incomplete row.
- Unit tests: `_shared/email-logger.test.ts` (Deno).
- Repo-audit: regex-scan over alle `logEmail({ … })`-blokken; faalt als
  enige call zonder `template_name` of `actor` blijft. Zie het laatste
  audit-rapport in `/mnt/documents/email-logging-audit.xlsx`.

## Front-end zichtbaarheid

`ItemEmailLogPopover` (`src/components/admin/ItemEmailLogPopover.tsx`)
queriet `email_log` op drie manieren parallel:

1. `related_item_id = itemId` → label **Item**
2. `metadata.item_ids @> [itemId]` → label **Groep**
3. `related_request_id = requestId AND related_item_id IS NULL` → label **Project**

Entries waar `metadata.template_name` of `metadata.actor` ontbreekt of
leeg is, krijgen een amber waarschuwing in de popover (legacy rows van
vóór de validatie). Nieuwe sends mét incomplete metadata worden
voorafgaand aan de DB-insert geweigerd.
