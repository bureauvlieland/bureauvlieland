## Wat we bouwen

Een admin kan een project (program_request) **snoozen tot een datum**. Tijdens snooze:
- Geen nieuwe interne auto-todo's voor dit project
- Bestaande open auto-todo's voor dit project worden direct gesloten met reden `snoozed`
- Geen automatische reminder-mails (naar partner of klant) voor dit project
- Project verdwijnt uit de Werkbank-actielijst — apart filter "Toon gesnoozede" maakt 'm terugvindbaar
- Op de wek-datum komt het project automatisch terug; bestaande crons maken weer todos aan zodra de criteria opnieuw geldig zijn

Niets dat snooze NIET blokkeert: klant/partner-portalen blijven werken, ad-hoc admin-acties (offerte versturen, mail typen) werken gewoon, inkomende chat/e-mail wordt nog vastgelegd.

## UX

**Projectdetail (admin)** — nieuwe knop **"Snooze"** in de header. Dialog:
- Datumpicker (verplicht, default vandaag + 7 dagen, min morgen, max 12 maanden)
- Quick-presets: +3 dagen, +1 week, +2 weken, +1 maand
- Reden (optioneel, bv. "Klant overlegt intern tot 20 juni")
- Bevestigingsknop: "Snooze tot {datum}"

Als al gesnoozed: subtiele gele banner bovenaan met "💤 Gesnoozed tot {datum} — {reden}" en knoppen **"Wakker maken"** + "Datum aanpassen".

**Werkbank** — gesnoozede projecten standaard verborgen. Schakelaar onderaan filters: **"Toon gesnoozede (n)"**. Snoozede projecten krijgen 💤-badge met wek-datum.

## Technisch

**1. Migratie** — kolommen op `public.program_requests`:
- `snoozed_until timestamptz NULL`
- `snoozed_at timestamptz NULL`
- `snoozed_by uuid NULL`
- `snoozed_reason text NULL`
- Index `program_requests_snoozed_until_idx` op `snoozed_until` (partial: WHERE snoozed_until IS NOT NULL).

Op `public.admin_todos` (al bestaand) wordt `closed_reason='snoozed'` een toegestane waarde — geen schema-wijziging als kolom al text-vrij is.

**2. Edge functions**
- `check-pending-items/index.ts`: aan elke query op `program_requests` filter toevoegen `(snoozed_until IS NULL OR snoozed_until <= now())`. Voor item-gebaseerde checks: join + filter op het bovenliggende project. Ook voor de uitgaande reminder-mails (3-dagen request-reminder, 5-dagen offerte-reminder) hetzelfde filter — daarmee pauzeert ook de uitgaande mail-stroom.
- `reconcile-admin-todos/index.ts`: nieuwe pass aan het begin die alle open `admin_todos` waarvan `related_request_id` verwijst naar een project met `snoozed_until > now()` direct sluit (`status='done'`, `closed_reason='snoozed'`, `closed_by='system'`).
- Eventueel een `cleanup-stale-todos`-pass-through gebruikt al `program_requests` — daar dezelfde filter toevoegen.

**3. Frontend**
- Nieuw: `src/components/admin/SnoozeProjectButton.tsx` — dialog met datumpicker, presets, reden, formele 'u'-toon. Bij submit:
  - `supabase.from("program_requests").update({ snoozed_until, snoozed_reason, snoozed_at: now(), snoozed_by: user.id })`
  - Direct lokaal `admin_todos` voor dit project sluiten (`status='done'`, `closed_reason='snoozed'`) zodat de UI niet hoeft te wachten op de cron
  - Insert in `program_request_history` (`action='snoozed'`, `new_value={until, reason}`)
- Nieuw: `SnoozedProjectBanner` — gele banner bovenaan projectdetail met "Wakker maken" (clear snooze + log `action='unsnoozed'`) en "Datum aanpassen" (heropent dialog).
- Plaatsen in:
  - `src/pages/admin/AdminRequestDetail.tsx` (header)
  - `src/components/admin/werkbank/ProjectDetailPanel.tsx` (header rechterpaneel)
- `src/lib/getInbox.ts` (of waar de Werkbank-query staat): standaard filter `snoozed_until IS NULL OR snoozed_until <= now()`. Nieuwe prop `showSnoozed` haalt filter weg. Badge in lijstitem als gesnoozed.

**4. Logging & memory**
- `program_request_history` krijgt entries voor `snoozed` / `unsnoozed`.
- Nieuw memory-bestand `mem://features/project-snooze` met: kolommen, gedrag van crons, UX-conventies en uitzonderingen (klant/partner-portalen blijven werken; chat/inkomende mail wordt niet onderdrukt).

**RLS** — geen wijziging nodig; bestaande policies op `program_requests` (admin = full access) dekken `UPDATE` van de nieuwe kolommen.