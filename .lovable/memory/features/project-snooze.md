---
name: Project snooze
description: Admin kan een project (program_request) snoozen tot datum X; tot dat moment geen auto-todos, geen reminder-mails, en bestaande open auto-todos worden direct gesloten
type: feature
---

## Doel

Soms staat een project even "in de wacht" (klant overlegt intern, evenement is nog ver weg, eerst wachten op een partner). Een admin kan dan het hele project snoozen tot een gekozen datum, zodat de Werkbank niet vol blijft staan met meldingen.

## Datamodel

Op `public.program_requests`:
- `snoozed_until timestamptz NULL` — actief gesnoozed zolang `snoozed_until > now()`.
- `snoozed_at timestamptz NULL` — wanneer ingesteld.
- `snoozed_by uuid NULL` — `auth.uid()` van de admin.
- `snoozed_reason text NULL` — optionele toelichting.
- Index `program_requests_snoozed_until_idx` (partial, WHERE NOT NULL).

Geen schema-wijziging op `admin_todos` — gesnoozede projecten sluiten hun open auto-todos via een gewone `status='done'` update.

## Gedrag (cron-jobs)

`supabase/functions/check-pending-items/index.ts`:
- Aan het begin een `Set<string>` van `snoozedRequestIds` opbouwen (`snoozed_until > now()`).
- Helper `isSnoozed(id)` skip-guard aan het begin van ELKE per-project loop. Voor accommodation-quote-loops gebruikt de guard `quote.request.linked_program_id`.
- Hierdoor worden zowel todos als reminder-mails (partner-quote, customer-status, T-7/T-3 partner event-mails, aftersales, etc.) gepauzeerd zolang het project gesnoozed is.

`supabase/functions/reconcile-admin-todos/index.ts`:
- Snooze-sweep: alle open `admin_todos` waarvan `related_request_id` (of `auto_entity_id` als dat een uuid is) hoort bij een gesnoozed project worden gesloten met `markClosed(t.id, "snoozed")`.

## Frontend

- `src/components/admin/SnoozeProjectButton.tsx` — dialog met datumpicker (min = morgen, max = +12 maanden), quick-presets (+3d / +1w / +2w / +1m), optionele reden. Bij snooze: update kolommen, sluit lopende `admin_todos` voor dit project direct, log `program_request_history` met `action='snoozed'`. Bij wakker maken: clear kolommen + log `action='unsnoozed'`.
- Gemount in `src/pages/admin/AdminRequestDetail.tsx` (header action row + banner bovenaan) en `src/components/admin/werkbank/ProjectDetailPanel.tsx`.
- `src/lib/getProject.ts` — `ProjectSummary` heeft `snoozedUntil`, `snoozedReason`, `snoozedAt`, `isSnoozed`. `listProjectsForWerkbank({ includeSnoozed })` standaard `false` (gesnoozede projecten verborgen).
- `src/lib/getInbox.ts` — `loadInbox({ includeSnoozed })` propageert hetzelfde.
- `src/pages/admin/AdminWerkbank.tsx` — laadt altijd ook gesnoozede projecten (`includeSnoozed: true`) en filtert client-side. Toggle-knop "Gesnoozed (n)" in de filter-rij zet de zichtbaarheid aan/uit (URL-param `snoozed=1`). Inbox- en Projecten-rijen krijgen een 💤-badge met de wek-datum.

## Wat NIET gepauzeerd wordt

- Klantportaal (`/mijn-programma/:token`) en partnerportaal blijven volledig werken.
- Handmatige admin-acties (offerte versturen, status-mail typen, chat) werken gewoon.
- Inkomende chat/e-mail wordt nog steeds vastgelegd.
- Op de wek-datum komt het project automatisch terug; `check-pending-items` maakt weer todos aan zodra criteria opnieuw geldig zijn.
