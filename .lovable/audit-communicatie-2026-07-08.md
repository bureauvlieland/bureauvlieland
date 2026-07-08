# Audit e-mailcommunicatie — 8 juli 2026

Snapshot van de bedrijfszekerheid van alle transactionele e-mail na de "waterdicht"-slag.

## Wat er nu staat

- **Suppressielijst** (`email_suppressions`) actief. Webhook zet hard bounces / spam / blocks / unsubscribes automatisch weg. `sendMailjet` blokkeert nieuwe verzending naar deze adressen (fail-open bij DB-storing).
- **Idempotency** in `_shared/mailjet-send.ts` (`findRecentIdempotentSend`, kolom `email_log.idempotency_key`).
- **MessageID-tracking** in alle ~50 send-functies via `extractMessageIds`. Webhook koppelt open/click/bounce.
- **Test mode** (`MAILJET_TEST_MODE=1`) — fake MessageID's, geen echte send. E2E-ready.
- **Email Health dashboard** (`/admin/email-health`) met stats, missing-ID monitor, suppression-tab.

## Idempotency-integratie call-sites

| Functie | Key-format | Status |
| --- | --- | --- |
| `send-bureau-invoice-to-customer` | `bureau-invoice-{invoiceId}-{recipient}` | ✅ actief |
| `send-commission-invoice-to-partner` | `commission-invoice-{invoiceId}-{recipient}` | ✅ actief |
| `select-accommodation-quote` (3 sends) | `accommodation-select-{quoteId}-{type}` | ⏳ te doen |
| `send-program-request` | `program-request-{itemId}-{partnerId}` | ⏳ te doen |
| `send-accommodation-quote-request` | `accommodation-request-{quoteId}` | ⏳ te doen |
| `forward-bureau-invoice` | `forward-bureau-{invoiceId}-{recipient}` | ⏳ te doen |
| `forward-commission-invoice` | `forward-commission-{invoiceId}-{recipient}` | ⏳ te doen |
| `send-customer-aftersales` | `aftersales-{projectId}` | ⏳ te doen |
| `send-partner-reset-email` | `partner-reset-{partnerId}` | ⏳ te doen |
| `admin-reset-partner-password` | `partner-reset-admin-{partnerId}` | ⏳ te doen |

Reden fasering: bureau- en commissiefacturen zijn de enige sends met _direct financieel dubbelrisico_ (dubbelklik = dubbele factuurmail naar klant/partner). De overige zijn cosmetisch of self-healing (offerteflow blokkeert al op status).

## Openstaande hardening

1. **Snapshot-tests templates** — `tests/email-templates.snapshot.test.ts` (subject + HTML per type) — nog niet gebouwd. Beschermt tegen sluipende copy-regressies.
2. **E2E Playwright-suite** — factuur → partneroffertes → klantakkoord → factuur → aftersales met `MAILJET_TEST_MODE=1`. Draaien voor elke release. Nog niet gebouwd.
3. **Webhook heartbeat** — pg_cron dat alert stuurt als Mailjet-webhook >6u geen event levert. Voorkomt stille feedback-blindheid.
4. **Backlog historische 141 sent-rijen zonder `mailjet_message_id`** — bewust niet gebackfilled (Mailjet API geeft ID niet retroactief per body-hash).

## Wat we vandaag NIET aanraken

- Externe penetratietest / security audit.
- Load-test tegen Mailjet-quota.
- Alternatieve providers (Postmark / Resend) — vendor lock-in blijft acceptabel.
