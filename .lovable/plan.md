## Situatie

Je hebt in GitHub secrets gezet:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

De `e2e-smoke` job heeft daarnaast ook `SUPABASE_SERVICE_ROLE_KEY` en `CI_FIXTURE_SECRET` nodig. De **service role key is op Lovable Cloud niet beschikbaar** in de UI — die kun je dus niet in GitHub zetten. Zonder die key kan de smoke-test niet mint-en/seeden via service role en faalt hij sowieso.

## Voorstel

De `e2e-smoke` job uit `.github/workflows/ci.yml` verwijderen (inclusief de referentie in de `ci-status` job). De echte dekking blijft overeind:

- **Vitest** (frontend unit tests) — dekt logica, guards, portal-status, financials, workflow.
- **Deno edge function tests** — dekt edge functions in isolatie.
- De smoke-test was een "bonus" pre-prod check die alleen op `main` draaide en de dev-backend muteerde. Nuttig, maar niet kritiek — en niet uitvoerbaar zonder service role key.

## Wijzigingen

**`.github/workflows/ci.yml`:**
1. Verwijder de volledige `e2e-smoke:` job (regels ~87–133).
2. In `ci-status`:
   - `needs: [frontend-tests, edge-function-tests, e2e-smoke]` → `needs: [frontend-tests, edge-function-tests]`
   - Verwijder de `sm=` regel, de smoke-rij in de tabel, en het smoke-status-check blok onderaan.

## Gevolgen

- CI slaagt zodra Vitest + Deno groen zijn (probleem 1 en 2 uit de vorige ronde zijn al gefixt).
- Pre-productie smoke draait niet meer automatisch. Wil je 'm later terug, dan moet er een pad zijn om de service role key veilig aan CI te geven (bijv. via een aparte staging-Supabase die je zelf beheert, buiten Lovable Cloud).

## Alternatief

Als je de smoke wél wilt houden: we kunnen 'm behouden maar met `if: false` uitschakelen, zodat het skelet in de repo blijft staan voor later. Zeg het maar.
