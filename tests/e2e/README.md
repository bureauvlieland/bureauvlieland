# End-to-end tests

Eén happy-path E2E per kritieke flow. Niet draaiend in Lovable Cloud CI —
Playwright en de service-role-key zijn lokaal nodig.

## Setup

```bash
bun add -d @playwright/test
bunx playwright install chromium
```

`.env` moet `VITE_SUPABASE_URL` bevatten. Zet daarnaast (lokaal of in eigen
CI) `SUPABASE_SERVICE_ROLE_KEY` voor DB-verificatie en cleanup.

## Draaien

```bash
# Dev server in een ander tabblad
bun run dev

# Tests
bunx playwright test
```

## Scope

- `self-service-submit.spec.ts` — configurator → DB-bevestiging dat
  `program_request_items` ≥ 1 en `selected_dates` lokaal correct is.
- `invoice-idempotency.spec.ts` — `send-bureau-invoice-to-customer` gedraagt
  zich idempotent: tweede send met dezelfde `invoiceNumber+recipient` binnen
  10 min short-circuit met `{ deduped: true }` en creëert geen tweede
  `email_log`-rij. Mint admin-JWT via `mint-ci-admin-jwt` — vereist
  `CI_FIXTURE_SECRET`.
- `mailjet-webhook.spec.ts` — `mailjet-event-webhook` weigert requests zonder
  token (401) en verwerkt een hard-bounce door `email_log.status='bounced'`
  te zetten én een `email_suppressions`-rij aan te maken. Vereist
  `MAILJET_WEBHOOK_TOKEN`.
- `inbound-purchase-invoice.spec.ts` — Mailjet Parse-payload zonder
  PDF-bijlage landt in `purchase_invoice_inbox` met `scan_status='failed'`
  en de bekende foutmelding.

Uitbreiden pas wanneer een test stabiel groen draait. Liever één test die
altijd klopt dan tien die niemand serieus neemt.

