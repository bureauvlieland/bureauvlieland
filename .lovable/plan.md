## Doel

1. Alle 9 opvallendheden uit het mail-audit oplossen.
2. Daarna alle e-mailteksten (edge-function fallbacks + DB-templates) controleren op consistentie met de actuele workflow en huisstijl.

## Stap 1 — Cron-guards & dubbele T-3 oplossen

### 1a. `supabase/functions/check-pending-items/index.ts`
Bestaande guards (skip_partner_notification + fase + initiële mail) ook toepassen op:
- CHECK 1 `reminder_activity_pending` (regel ~295-322) — nu nog kale `partner` check.
- CHECK 2 `reminder_quote_pending` (regel ~404-436) — analoog: skip als logies-aanvraag nooit officieel is verstuurd.
- T-7 `partner_activity_unconfirmed_t7` en T-3 `partner_briefing_t3` (al gedaan vorige turn — verifiëren).
- Aankomst/gastenlijst-cron-blokken voor klant: skip projecten zonder `customer_approved_at` op project-niveau of zonder workflow_phase ∈ {`akkoord_ontvangen`, `in_uitvoering`}.

Helper extraheren: `shouldSkipPartnerComm(item, request, hasInitialEmail)` → boolean, met console.log van reden.

### 1b. T-3 dubbele heads-up
`check-pending-items` stuurt `partner_briefing_t3` én `send-partner-headsup-t3` stuurt `partner_headsup_t3`. Beide op T-3, beide naar dezelfde partner.

Beslissing: **`send-partner-headsup-t3` is de uitgebreide versie (met gastenlijst, dieetwensen, locatie, instructies) en blijft. De `partner_briefing_t3` in check-pending-items wordt verwijderd.**

### 1c. `send-partner-headsup-t3` dezelfde guards toevoegen
Filter al op `status=accepted` en `skip_partner_notification=false`, maar mist:
- Check op aanwezigheid van initiële `program_request_partner`-mail in `email_log`.
- Check dat `customer_approved_at` is gezet op het item (workflow vereist klant-akkoord).

### 1d. `send-arrival-reminder` en `send-guest-details-reminder`
Guard toevoegen: alleen versturen als project `workflow_phase` ∈ {`akkoord_ontvangen`, `in_uitvoering`} en niet `cancelled`.

### 1e. Reminder-cadans `partner_invoice_reminder_t1` → T+3
`check-pending-items` regel 862-895: `oneDayAgo` vervangen door `threeDaysAgo` voor invoice-reminder. T+7 escalatie blijft staan. (Todo's voor admin blijven op T+1/T+7 ongewijzigd — alleen de e-mail naar partner schuift naar T+3.)

## Stap 2 — Workflow `accept-quote-proposal` opruimen

`accept-quote-proposal` werd gebruikt voor totaal-akkoord (oude flow). Klant keurt nu per item goed via `approve-quote-item`. Risico: dubbele `program_request_partner`-mail.

Actie:
- Code-check: zoek frontend-aanroepen van `accept-quote-proposal`. Indien nog actief → markeren als deprecated en mail-versturen stoppen (alleen DB-status update); de per-item flow stuurt al de juiste mail. Indien niet meer aangeroepen → functie loggen als ongebruikt (niet verwijderen i.v.m. legacy URL's).

## Stap 3 — Interne mails → admin-todos

`update-customer-program` stuurt drie "interne" mails naar bureau-inbox:
- `internal_people_change_accommodation`
- `customer_date_change_bureau`
- `all_items_accepted_bureau`

Vervangen door `admin_todos`-inserts met dezelfde context (titel + beschrijving + related_request_id). Dit reduceert inbox-ruis. E-mail-call vervangen door todo-insert; `logEmail` weghalen.

## Stap 4 — Mail-teksten audit

Na alle code-aanpassingen een tekstuele review. Per kanaal controleren:

### 4a. Edge-function fallback HTML (in `index.ts` van elke functie)
Controle op:
- Aanhef ("u" voor klant, "je" voor partner).
- Positionering (geen "regie", wel "lokale specialist / programma-ontwikkelaar / boekingskantoor").
- Geen `facturatie@bureauvlieland.nl` — gebruik `inkoop@reply.bureauvlieland.nl` / `hallo@bureauvlieland.nl`.
- Centrale facturatie-zin klopt: partner stuurt factuur naar Bureau Vlieland, niet naar klant.
- CTA-knoppen kloppen (partner-portaal vs klant-portaal vs ondertekenen).
- Status-terminologie: "goedgekeurd" (per onderdeel) vs "akkoord" (heel project) — zoals memorialiseerd.

### 4b. DB-templates `email_templates`-tabel
`SELECT id, subject, body_html FROM email_templates` doorlopen. Per template dezelfde checks. Updates via `psql` INSERT-only — daarom een migration voor UPDATE-statements.

### 4c. Specifieke teksten die we moeten nalopen
- `program_request_partner` / `program_partner_reapproval` — moet duidelijk zijn dat dit eerste-keer vs hernieuwd akkoord is.
- `status_alternative` (partner stelt tijd voor) — wat ziet klant?
- `cancellation_*` — vermelden of partner nog factuur stuurt voor reeds verrichte werk.
- `customer_aftersales_review` — check links naar Google + eigen review.
- `arrival_reminder` / `guest_details_reminder` — check leadtime-formuleringen.

## Stap 5 — Verificatie

- `vitest run` (bestaande tests blijven groen, geen statuslogica gewijzigd).
- `supabase--read_query` op `email_log` voor BV-2606-0022: bevestigen dat geen nieuwe ghost-reminders ontstaan.
- Edge-function logs van `check-pending-items` na deploy: skip-redenen zichtbaar in console.
- Korte dry-run van `send-partner-headsup-t3` (`{ dry_run: true }`) om te zien welke items eruit gefilterd worden.

## Niet in scope

- Geen wijzigingen aan UI-statuslabels (al gedaan in vorige turns).
- Geen nieuwe mail-templates introduceren — alleen opschonen wat er is.
- Geen wijziging aan inkomende mail-flow (`inbound-email`).

## Open vraag

Bij stap 1e: schuift de **eerste** partner-invoice-reminder naar T+3 (zoals voorgesteld), of liever T+5? Default in plan = T+3. Laat het weten als T+5 prettiger is.
