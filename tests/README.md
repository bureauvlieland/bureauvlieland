# Test suite

Dit project heeft drie testlagen. Alle commando's draaien in de project-root.

## Unit-tests (Vitest)

```bash
bun test
```

Draait alle `*.test.ts` / `*.test.tsx` in `src/` en `tests/` (exclusief `tests/e2e/`).

- 23 testbestanden, > 240 tests
- Controleert prijsberekeningen, workflow/status-overgangen, route-integriteit, regressie guards.

## Edge-function tests (Deno)

```bash
bunx deno test --allow-env --allow-net supabase/functions/_shared/mailjet-send.test.ts
bunx deno test --allow-env --allow-net supabase/functions/send-bureau-invoice-to-customer/index_test.ts
bunx deno test --allow-env --allow-net supabase/functions/send-commission-invoice-to-partner/index_test.ts
```

Deze tests stubben Mailjet, Supabase en storage. Ze bewijzen dat:

- Mailjet MessageID's correct worden gelogd;
- suppressie en idempotency dubbele verzendingen blokkeren;
- de twee factuur-functies auth-checken, valideren, verzenden en loggen.

## E2E-tests (Playwright)

Zie `tests/e2e/README.md`. Draaien lokaal met `SUPABASE_SERVICE_ROLE_KEY` en
— voor de nieuwe suites — `CI_FIXTURE_SECRET` (idempotency-test) en
`MAILJET_WEBHOOK_TOKEN` (event-webhook-test). Zonder deze secrets slaan de
bijbehorende tests zichzelf over.

```bash
bunx playwright test
```

Huidige scope:
- `self-service-submit.spec.ts` — happy-path configurator.
- `invoice-idempotency.spec.ts` — bureau-factuur idempotency.
- `mailjet-webhook.spec.ts` — Mailjet event-webhook auth + hard bounce.
- `inbound-purchase-invoice.spec.ts` — inbound-factuur zonder PDF.

## CI-notitie

`bun test` is als script in `package.json` opgenomen. Edge-function tests en
Playwright vereisen extra secrets / lokale setup en draaien apart.
