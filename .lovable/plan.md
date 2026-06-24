## Doel
Voorkomen dat de self-service-flow (en vergelijkbare kritieke submit-paden) opnieuw stilletjes breekt na een refactor. Drie elkaar versterkende lagen, oplopend van snel naar diep.

## Laag 1 — Contract-tests rond Supabase-calls (snel, CI)

Per kritieke submit-flow een testbestand dat de Supabase-client mockt en de **payload + volgorde + foutafhandeling** afdwingt. Dit vangt regressies als "items werden niet ingevoegd" of "datum als UTC opgeslagen" zonder een browser nodig te hebben.

Bestanden:

- `src/components/configurator/__tests__/CheckoutContactForm.submit.test.tsx`
  - Bouw render-helper met react-testing-library + gemockte `@/integrations/supabase/client`.
  - Cases:
    1. Happy path: vult formulier, drukt submit → assert exact één `program_requests.insert` met `selected_dates` als lokale `yyyy-MM-dd` strings (test in fake TZ `Europe/Amsterdam`, gekozen datum 7 juli → payload bevat `"2025-07-07"`, **niet** `"2025-07-06"`).
    2. Volgorde: `program_requests.insert` MOET vóór `program_request_items.insert` worden aangeroepen, en items-insert MOET ≥1 row bevatten als de cart niet leeg is.
    3. Building blocks niet geladen → submit aborteert vóór elke insert (geen call naar `program_requests.insert`).
    4. items-insert faalt → er volgt een rollback-delete op de zojuist aangemaakte `program_requests`-id (geen weeskind).
    5. Duplicaat binnen 24u (zelfde email + dates) → blokkeer, geen insert.
- Vergelijkbaar dunne contract-test voor twee andere kritieke paden:
  - `src/components/customer/__tests__/CustomerProgram.approve.test.tsx` — klant goedkeuren zet `customer_approved_at` op alle juiste items, niet op cancelled.
  - `src/components/partner/__tests__/PartnerQuoteForm.submit.test.tsx` — partner-offerte indienen zet de juiste velden en triggert geen update op beschermde financiële kolommen.

Conventie vastleggen in `src/test/README.md`: "elke nieuwe submit-flow krijgt een contract-test naast pure-functie tests".

## Laag 2 — Eén Playwright happy-path E2E (echte browser, echte DB)

Doel: end-to-end bewijs dat configurator → admin werkt. Eén test, draait headless tegen lokale dev + cloud DB met een testaccount.

- `tests/e2e/self-service-submit.spec.ts`
  - Stappen: open `/`, klik "Start uw aanvraag", kies een building block, voeg toe aan cart, kies datum, vul checkoutgegevens met seed-email `e2e+<timestamp>@bureauvlieland.nl`, submit, verwacht success-pagina met `BV-` referentie.
  - Verificatie via supabase-client met service role: `program_requests` bestaat **en** `program_request_items` count ≥ 1 **en** `selected_dates[0]` == verwachte lokale datum.
  - Cleanup: verwijder de test-aanvraag na assert.
- Script `tests/e2e/run.sh` + GitHub Action (of equivalent) die deze test draait op elke PR die `src/components/configurator/**` of `supabase/functions/**` raakt.

Eén test is bewust de scope — uitbreiden pas als deze stabiel draait.

## Laag 3 — DB-vangnet tegen lege program_requests

Defense in depth: zelfs als beide testlagen ooit falen, mag de admin nooit een lege aanvraag zien.

- Migration: `validate_program_request_has_items()` trigger, `AFTER INSERT` op `program_requests`, met `INITIALLY DEFERRED` constraint-trigger zodat de transactie de items in dezelfde commit mag invoegen, maar bij commit afdwingt dat er ≥1 `program_request_items` bestaat voor deze `program_request_id` — behalve voor draft/maatwerk-intake types waar dit legitiem leeg kan zijn (witelist via `request_type`).
- Bijbehorende test in Laag 1 case 4 wordt aangevuld: verwacht dat een geknipte transactie (insert request, geen items) door de trigger wordt afgewezen.

## Technische details

- Vitest-mocking patroon: één `mocks/supabaseClient.ts` helper die `.from(table).insert(...)` / `.update(...)` / `.select()` chains opvangt en payloads logt voor assertions. Hergebruikt door alle contract-tests.
- Tijdzonebewuste datum-test: `vi.setSystemTime` + `process.env.TZ = 'Europe/Amsterdam'` aan begin van het bestand om UTC-shift-regressies te garanderen.
- Playwright zit nog niet in het project; toevoegen via `bun add -d @playwright/test` plus `playwright.config.ts` met baseURL `http://localhost:8080`.
- DB-trigger: deferrable constraint-trigger; whitelist op `request_type IN ('maatwerk_intake')` (en eventueel `program_drafts` blijven sowieso buiten schot want andere tabel).

## Buiten scope

- Nieuwe features of UI-wijzigingen.
- Bredere E2E-suite dan deze ene happy path (later uit te breiden).
- Refactor van `CheckoutContactForm.tsx` zelf — alleen tests + DB-vangnet eromheen.
