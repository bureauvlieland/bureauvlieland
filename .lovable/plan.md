## Wat er nu misgaat

1. **Facturatie-taak verschijnt te vroeg.** Zodra de klant de voorwaarden accepteert (of jij handmatig "klaar voor facturatie" zet), wordt in `update-customer-program` respectievelijk `set-project-ready-for-invoice` meteen een `admin_todos`-regel *"Facturatie voor {klant}"* aangemaakt zonder `due_date` of `snoozed_until`. Die taak staat dus al maanden vóór het event op de werkbank onder *Actie deze week*, terwijl je pas ná de einddatum wilt factureren. Aanbetalingsfacturen mogen ondertussen wel gemaakt worden, maar hoeven geen taak of Claudia-signaal te triggeren.

2. **Claudia negeert gefactureerde projecten niet volledig.** In `supabase/functions/_shared/projectActivity.ts` bevat `TERMINAL_COMPLETION_STATUSES` wel `ready_for_invoice`, `invoiced`, `completed`, `feedback_received` en `cancelled`, maar **niet** `partially_invoiced` (aanbetaling verstuurd) en **niet** `fully_invoiced` (volledig gefactureerd). Beide statussen worden in de rest van de app wél gebruikt. Daardoor blijft `claudia-daily-scan` signalen (en dus aanbevelingen op je dashboard) genereren voor projecten die feitelijk al afgehandeld zijn.

## Wat er verandert

### 1. Facturatie-taak snoozen tot na de einddatum
- In `supabase/functions/update-customer-program/index.ts` (rond regel 1117-1125) blijft de `completion_status`-overgang naar `ready_for_invoice` staan, maar de nieuw aangemaakte `invoicing_ready`-todo krijgt meteen `snoozed_until = laatste selected_date + 1 dag`. Zolang die datum in de toekomst ligt, blijft de taak uit `getInbox()` (die filtert al op `snoozed_until.is.null,snoozed_until.lte.${today}`) en dus uit de werkbank-lijst; hij verschijnt automatisch de dag na afloop van het event.
- In `supabase/functions/set-project-ready-for-invoice/index.ts` (regel 135-146, de handmatige "Markeer als klaar voor facturatie"-knop) wordt dezelfde snooze-regel toegepast. Als de einddatum al is gepasseerd staat de taak direct op de werkbank; anders wacht hij netjes tot dan.
- Aanbetalingsfacturen blijven volledig los staan: die maak je nu al handmatig via `/admin/facturatie` en veranderen niets aan de todo-status.
- Als er (nog) geen `selected_dates` bekend zijn, valt het terug op het huidige gedrag (geen snooze) — zeldzaam, maar veilig.
- **Eenmalige backfill** via SQL: bestaande open `invoicing_ready`-todo's krijgen alsnog `snoozed_until = einddatum + 1 dag` op basis van `program_requests.selected_dates`. Zo verdwijnen taken als *"Facturatie voor Jeannette van Spil"* en *"Facturatie voor Milou van der Zwaan"* uit *Actie deze week* tot na hun eigen einddatum.

### 2. Claudia stopt met signalen voor gefactureerde projecten
- In `supabase/functions/_shared/projectActivity.ts` wordt `TERMINAL_COMPLETION_STATUSES` uitgebreid met `partially_invoiced` en `fully_invoiced`. `claudia-daily-scan` gebruikt deze set al om alle signalen voor zo'n project in één keer te droppen — dus álle categorieën (partner-reminders, quote-flows, todo_overdue, enz.) worden meteen genegeerd zodra een aanbetalings- of eindfactuur verstuurd is.
- Bijkomend effect: deze projecten tellen mee bij `suppressed.terminal` in de scan-log in plaats van door te stromen naar AI-prioritering.

### 3. Bestaande aanbevelingen opschonen
- `admin_recommendations` wordt bij elke Claudia-run opnieuw geschreven. Na de eerstvolgende scan verdwijnen de foutieve aanbevelingen automatisch. Geen aparte migratie nodig.

## Wat er niet verandert

- De overgangen `ready_for_invoice` / `partially_invoiced` / `fully_invoiced` zelf blijven zoals ze zijn.
- Het facturatieoverzicht (`/admin/facturatie`) blijft alle projecten tonen — daar hoort de status ook thuis.
- Handmatige snoozes en het handmatig openen van een taak blijven werken; snooze is alleen een default die je met één klik kunt intrekken.

## Technische samenvatting

- Nieuwe hulpfunctie in beide edge functions: `computeInvoicingSnooze(selected_dates)` → geeft een ISO-datum (event-einde + 1 dag) of `null`.
- Backfill-SQL (eenmalig):

```sql
UPDATE admin_todos t
SET snoozed_until = sub.snooze_date
FROM (
  SELECT pr.id AS request_id,
         (MAX((d)::date) + INTERVAL '1 day')::date AS snooze_date
  FROM program_requests pr,
       jsonb_array_elements_text(to_jsonb(pr.selected_dates)) d
  GROUP BY pr.id
) sub
WHERE t.related_request_id = sub.request_id
  AND t.auto_type = 'invoicing_ready'
  AND t.status <> 'done'
  AND sub.snooze_date > CURRENT_DATE
  AND (t.snoozed_until IS NULL OR t.snoozed_until < sub.snooze_date);
```

- `TERMINAL_COMPLETION_STATUSES` in `supabase/functions/_shared/projectActivity.ts` uitbreiden met de twee ontbrekende waarden; geen andere aanroepplekken hoeven aangepast omdat `TERMINAL_COMPLETION_STATUSES.has(a.completionStatus)` het meteen oppikt.
