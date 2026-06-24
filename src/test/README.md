# Test-conventies

Drie lagen testen, oplopend in kosten en realisme. Elke nieuwe submit-flow
krijgt minstens een **contract-test** in laag 1. Pure functies blijven gewoon
unit-getest.

## Laag 1 — Contract-tests (vitest, snel, geen browser)

Doel: borgen dat een specifieke flow (component → Supabase) de **juiste
payload in de juiste volgorde** verstuurt, en bij fout opruimt. Vangt
regressies die pure-functie tests per definitie niet zien.

Twee stijlen, kies wat past:

1. **Source-grep guards** (zoals `configuratorSubmitGuards.test.ts`,
   `partnerQuoteUpdateGuards.test.ts`). Snel, geen mocking nodig, dwingt
   structurele invariants af: "deze guard staat vóór deze insert", "deze
   velden komen NOOIT voor in dit update-blok".
2. **Mocked supabase rendertest** — voor flows waar volgorde- of
   payload-controle complex is. Mock `@/integrations/supabase/client`,
   render via `@testing-library/react`, assert exacte calls.

Regel: **elke nieuwe `*.insert(...)` / `*.update(...)` op een kritieke tabel
(`program_requests`, `program_request_items`, `accommodation_quotes`,
`accommodation_requests`) krijgt een guard-test**. Tabel-kritisch betekent:
fout = klantdata-verlies of beschermde-velden-lek.

## Laag 2 — Playwright E2E (echte browser, echte DB)

Zie `tests/e2e/README.md`. Eén happy path per kritieke flow, draait
handmatig of in CI vóór deploy. Vangt dingen die contract-tests niet
zien: dependency-loads, realtime-subscriptions, edge-function-roundtrips.

## Laag 3 — Database-vangnet

Triggers en constraints die voorkomen dat fouten ooit doorlekken naar de
admin, zelfs als beide testlagen falen. Voorbeeld:
`enforce_program_request_has_items_on_commit` blokkeert het opslaan van een
program_request zonder bijbehorende items voor self-service flows.

## Wat NIET in deze repo hoort

- Tests die alleen de implementatie spiegelen ("functie roept X aan").
- Snapshot-tests op grote componenten — te bros, vangen geen regressies.
- E2E voor edge-cases — die horen in laag 1 als contract-test.
