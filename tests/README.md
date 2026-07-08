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

Zie `tests/e2e/README.md`. Draaien lokaal met `SUPABASE_SERVICE_ROLE_KEY`.

```bash
bunx playwright test
```

## CI-notitie

`bun test` is nu als script in `package.json` opgenomen. Edge-function tests en Playwright vereisen extra secrets / lokale setup en draaien apart.
