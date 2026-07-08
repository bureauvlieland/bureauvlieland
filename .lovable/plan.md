# Unit-test audit & hardening plan

## Huidige stand (kort)

- **src/lib/__tests__**: 11 bestanden, deels Vitest, deels een custom runner die niet in CI faalt.
- **Edge functions**: alleen tests in `_shared/` (email-logger, mailjet-tracking); geen tests op individuele functions.
- **E2E**: 1 Playwright happy-path + 1 regressieguard (geen quote-PDF-knop in customer portal).
- **package.json**: geen `test` script; tests draaien niet automatisch.

Conclusie: we zijn **niet** up to date. De dekking ligt laag voor de processen die nu worden verhard (e-mail idempotency, suppressie, workflow-overgangen).

## Doel

Alle kritieke communicatie- en prijs/workflow-logica testbaar maken, zodat een release pas groen is als de unit-tests slagen. Focus op regels die al in productie staan en die nu handmatig worden gecontroleerd.

## Fasering

### 1. Testinfrastructuur repareren

- `package.json` script toevoegen: `"test": "vitest run"`.
- `portalPricing.consistency.test.ts` omzetten naar echte Vitest-tests (`describe` / `it` / `expect`) zodat een falende assertion ook in CI faalt.
- Vitest-config controleren: `tests/e2e/**` blijft excluded; de e2e-spec en de regressieguard onder `tests/` moeten wel correct meeliften.

### 2. src/lib unit-tests uitbreiden

High-risk pure functies die nu ongedekt of ondergedekt zijn:

- `portalPricing.ts` — reeds gedeeltelijk, maar omzetten naar Vitest + meer randgevallen.
- `vatCalculation.ts`, `commissionRates.ts`, `invoiceTotals.ts` — commissie ex-BTW, totaal inclusief/exclusief BTW.
- `itemStatus.ts`, `projectStatus.ts`, `customerQuoteApproval.ts` — status-overgangen, silence=agreement, "customer_approved_at" + "customer_accepted_at".
- `quoteItemSendStatus.ts`, `projectWorkflow.ts`, `bureauItem.ts` — verzenden, interne items, day_index -1.
- `programTemplateCopy.ts` — copy-logica zonder live API-afhankelijkheden.
- `autoTodoCreator.ts` — todo-aanmaakcriteria en sluitcriteria.
- `purchaseInvoiceDuplicateCheck.ts`, `partnerCompleteness.ts` — duplicaatdetectie en partner-validatie.

### 3. Shared edge-function helpers harden

Bestanden onder `supabase/functions/_shared/`:

- `mailjet-send.ts` — testen: idempotency-skip binnen 10 min, suppressie-blokkade, `MAILJET_TEST_MODE` fake-ID, MessageID extractie, fail-open bij DB-storing.
- `email-logger.ts` — bestaande tests uitbreiden met `idempotency_key` validatie.
- `bureau-item.ts`, `project-activity.ts` — logica voor interne items en activiteitslogging.

### 4. Deno-tests per kritieke e-mail edge function

Per function een `index_test.ts` met stubbed Mailjet-fetch en stubbed Supabase-service-role-client. Functies die minstens gedekt worden:

- `send-bureau-invoice-to-customer`
- `send-commission-invoice-to-partner`
- `select-accommodation-quote`
- `send-program-request`
- `send-accommodation-quote-request`
- `forward-bureau-invoice`
- `forward-commission-invoice`
- `send-customer-aftersales`
- `send-partner-reset-email`
- `admin-reset-partner-password`

Te testen gedrag:

- Idempotency-key zorgt dat tweede call geen mail verstuurt.
- Suppressie-list blokkeert verzending.
- `email_log` krijgt `template_name`, `actor`, `mailjet_message_id` (of fake-ID in test mode).
- Correcte status-overgangen / foutafhandeling bij ontbrekende data.

### 5. E2E / regressie-uitbreiding

- Playwright happy-path: factuur → partneroffertes → klantakkoord → factuur → aftersales, met `MAILJET_TEST_MODE=1`.
- Regressietest: geen offerte-PDF-knop in customer portal (bestaat al, behouden).
- Toevoegen: idempotency-dubbelklik-regressie en suppressie-workflow.

### 6. CI & runbook

- `bun test` moet groen draaien in de sandbox.
- `tests/README.md` bijwerken met:
  - `bun test` voor unit-tests
  - `supabase--test_edge_functions` voor Deno edge-function tests
  - Playwright-lokaal instructies (service-role-key nodig)

## Wat we NIET in deze slag doen

- Geen frontend component-tests (React Testing Library) — buiten scope.
- Geen load-tests of performance-tests.
- Geen externe penetratietest.

## Acceptatie

- `bun test` slaagt.
- `supabase--test_edge_functions` slaagt voor de 10 geselecteerde functions.
- De audit-rapportage in `/admin/email-health` toont minstens één extra test-dekking-indicator (bijv. "X van Y edge functions getest").