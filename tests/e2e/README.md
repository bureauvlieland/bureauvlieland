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

Uitbreiden pas wanneer deze stabiel draait. Liever één test die altijd
groen staat dan tien die niemand serieus neemt.
