## Doel

Projecten waarvan de uitvoeringsdatum in het verleden ligt moeten niet meer wachten op goedkeuringen / partneracties. Alle openstaande acties die alleen relevant zijn *vóór* de uitvoering worden automatisch afgehandeld, en de focus in klant- én adminportaal verschuift naar **facturatie** (met alleen nog de taken die daarvoor écht nodig zijn: gegevens facturatie + voorwaarden ondertekenen).

## Aanpak (in één samenhangende slag)

### 1. Nieuw gedeeld begrip: "past_execution"

Een project is `past_execution` als de laatste dag uit `selected_dates` < vandaag én het project niet `cancelled_at` of `completion_status='completed'` is.

Toevoegen in `src/lib/lifecycle.ts` (of nieuw `src/lib/projectExecutionState.ts`):
- `getProjectExecutionState(project) => "future" | "in_progress" | "past_execution"`
- Helper `isPreExecutionAction(autoType)` met whitelist van todo/actie-types die *alleen zin hebben vóór uitvoering* (zie §2).

### 2. Auto-afhandeling na uitvoeringsdatum (server-side)

Nieuwe edge function **`auto-close-past-execution`** (dagelijks via cron + handmatig knop in `/admin/system-health`):

Per project met `past_execution`:
1. **Program items** met status `pending_customer`, `pending_partner`, `counter_offer_partner`, `counter_offer_customer`, `pending_availability` → forceer naar `confirmed` (of `cancelled` als het item als `cancelled_by_customer/partner` gemarkeerd was). Log via `admin_activity_log` met reden `auto_closed_past_execution`.
2. **Accommodation quotes** in `pending` / `in_afstemming` van projecten met `past_execution`: markeer overgeblevens als `expired` (niet accepted), en sluit `select-accommodation-quote`-todo's.
3. **admin_todos** met `auto_type` in de pre-executie-whitelist: sluit met `status='done'`, `completed_at=now`, `completion_reason='auto_past_execution'`. Whitelist bevat o.a.:
   - `quote_pending_partner`, `quote_pending_customer`, `quote_expiring_soon`, `quote_expired_partner`
   - `request_no_response`, `all_partners_responded`, `customer_date_change_partner_notify`
   - `new_program_request`, `new_accommodation_request`
   - `customer_inputs_missing` (alleen het "goed te keuren" gedeelte — NIET `customer_billing_missing` / `customer_terms_missing`)
4. **Blijven open** (niet aanraken):
   - `customer_billing_missing` (facturatiegegevens)
   - `customer_terms_missing` (voorwaarden ondertekenen)
   - `partner_invoice_pending`, `commission_pending`, `bureau_invoice_pending`, `customer_aftersales`, `feedback_collect`
5. Zet `program_requests.completion_status = 'ready_for_invoicing'` als alle items uitgevoerd zijn én er nog geen aftersales/facturatie loopt (hergebruik logica uit `set-project-ready-for-invoice`).

Uitbreiden van bestaande `reconcile-admin-todos` / `cleanup-stale-todos` zodat ze deze nieuwe reden respecteren i.p.v. de todos opnieuw aan te maken.

### 3. Klantportaal — focus op facturatie

In `src/pages/customer/…` (Overzicht + Programma-tab):
- Als `past_execution` én er staan nog "goedkeur"-acties: die worden niet meer getoond (worden immers auto-afgesloten door de nightly job én ter plekke gefilterd voor snappy UX).
- Boven het programma verschijnt een informatieve callout: *"Uw programma is uitgevoerd. Wij bereiden nu de facturatie voor."*
- Rechter voortgangs-widget (zie screenshot) verandert:
  - "Programma" en "Logies" krijgen `✓ afgerond` label (geen actieknoppen meer).
  - "Gegevens & voorwaarden" blijft prominent zichtbaar (rood/amber accent) als `customer_billing_missing` of `customer_terms_missing` open staat.
  - Extra kaart "Facturatie" bovenaan (of pinnen) met status + link naar `/facturatie`-tab.
- Programma-onderdelen tonen badge **"Uitgevoerd"** i.p.v. "Goedkeuring nodig".

### 4. Partnerportaal

- Openstaande offerte-aanvragen / goedkeuring-verzoeken voor `past_execution` projecten worden verborgen uit de "Openstaand"-lijst en verplaatst naar "Afgesloten (automatisch)".
- Nieuwe partner-widget teller houdt alleen tel-mee items uit toekomstige projecten.

### 5. Admin werkbank

- Nieuw filter/badge in `/admin/projecten`: "Auto-afgehandeld na uitvoering" (subtiel), zodat je snel ziet wat de job heeft dichtgezet.
- Kaart in `/admin/system-health` (of `/admin/email-health`-stijl) met:
  - Aantal auto-afgesloten todo's per dag
  - Knop **"Draai auto-close nu"** (roept edge function aan)
  - Lijst uitzonderingen (projecten waar auto-close iets tegenkwam — bijv. onbekende status).
- Todo-overzicht toont nieuw filter "verberg auto-afgehandeld" (default aan).

### 6. Cron & backfill

- `supabase/config.toml`: cron `auto-close-past-execution` dagelijks 05:00.
- Éénmalige backfill-run bij deploy (via knop): sluit alle bestaande achterstallige acties.

### 7. Tests

Uitbreiden bestaande unit- en Deno-testsuite:
- `src/lib/__tests__/projectExecutionState.test.ts` — grenswaarden (vandaag, morgen, gisteren, cancelled, completed, geen datums).
- `src/lib/__tests__/autoTodoCreator.test.ts` — whitelist blijft correct (billing/terms niet aangeraakt).
- `supabase/functions/auto-close-past-execution/index_test.ts` — happy path + billing/terms blijven open + accommodation quote expire pad + reeds `completed` project overslaan + idempotent.
- E2E-smoke: seed een project 2 dagen in verleden, roep functie aan, assert dat items `confirmed` zijn en billing-todo nog open staat.

## Uit scope

- Automatisch versturen van herinneringen na uitvoeringsdatum (blijft manueel via bestaande aftersales-flow).
- Automatisch factureren zelf — we bereiden alléén voor.
- Wijzigen van BTW/prijs-logica.

## Acceptatiecriteria

- Voor elk project waarvan de laatste `selected_dates` > 1 dag geleden ligt: geen open `pending_customer` / `pending_partner` items en geen open goedkeur-todos meer.
- `customer_billing_missing` en `customer_terms_missing` blijven onaangetast en zichtbaar in klantportaal + admin-todo lijst.
- Klantportaal toont facturatie-focus i.p.v. goedkeur-callout zodra `past_execution`.
- `bun test` en `deno test` zijn groen inclusief nieuwe suites.

## Technische details

- Datumcheck server-side in UTC via `date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam')` om DST-mismatch te voorkomen.
- Auto-close functie is idempotent: gebruikt `completion_reason='auto_past_execution'` als guard om dubbele mutaties te voorkomen.
- Alle mutaties in één transactie per project (RPC of expliciete rollback bij error), zodat een halve auto-close niet blijft hangen.
- Frontend-filtering gebruikt dezelfde `getProjectExecutionState` helper om te voorkomen dat er drift ontstaat tussen UI en cron.
