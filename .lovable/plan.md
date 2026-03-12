

# Plan: Vier nieuwe features voor operationeel overzicht

## 1. Financieel Dashboard (`/admin/financieel`)

Nieuwe pagina met overzicht van alle financiële stromen:

- **KPI-rij bovenaan**: Totaal gefactureerd (klant), totaal inkoopfacturen, openstaande commissies, netto marge
- **Maandgrafiek** (Recharts): omzet vs inkoop per maand op basis van `bureau_invoices` en `partner_purchase_invoices`
- **Openstaande posten tabel**: projecten met `completion_status = ready_for_invoice` of items met `commission_status = pending_confirmation`
- **Commissie-samenvatting**: totalen per status (pending, confirmed, invoiced)

Voegt een nieuw menu-item toe onder "Financiën" in de sidebar.

## 2. Operationele Weekplanning (`/admin/planning`)

Nieuwe pagina met een week-/dagweergave:

- Query `program_request_items` met `proposed_date` of berekende datum (op basis van `selected_dates` + `day_index`)
- Query `accommodation_requests` voor aankomst/vertrekdagen
- **Dagindeling**: per dag tonen welke activiteiten plaatsvinden, welke groepen er zijn, welke partners betrokken zijn
- **Weeknavigatie**: vorige/volgende week knoppen
- Klikbare items die linken naar projectdetail

Voegt een nieuw menu-item "Planning" toe onder "Operationeel".

## 3. Post-uitvoering Auto-Todos

Twee nieuwe auto-todo types in `autoTodoCreator.ts`:

- **`post_execution_feedback`**: Na `executed_at` datum van een item (+ 1 dag), maak een taak "Feedback vragen aan [klant] voor [activiteit]"
- **`post_execution_invoice_check`**: Na `executed_at` (+ 7 dagen), controleer of er een `partner_purchase_invoice` is geregistreerd. Zo niet, maak taak "Factuur partner [naam] nog niet ontvangen voor [activiteit]"

Implementatie via de bestaande `daily-reminders` edge function (of een nieuwe scheduled function). Auto-resolve wanneer de factuur binnenkomt.

## 4. Pipeline-Funnel Overzicht

Nieuwe component op het dashboard OF als tab op de projectenpagina:

- Visuele funnel met fasen: **Nieuw** → **Offerte verstuurd** → **AV getekend** → **Uitgevoerd** → **Gefactureerd**
- Per fase: aantal projecten + totale waarde
- Gebaseerd op bestaande `getDerivedStatus()` logica uit `AdminProjects.tsx`
- Klikbare fasen die filteren op de projectenpagina

## Technische details

### Database migraties
- Geen nieuwe tabellen nodig — alles werkt met bestaande data
- Eventueel een index op `program_request_items.proposed_date` voor de weekplanning

### Nieuwe bestanden
- `src/pages/admin/AdminFinancialDashboard.tsx`
- `src/pages/admin/AdminPlanning.tsx`
- `src/components/admin/PipelineFunnel.tsx`
- `src/components/admin/WeekPlanningView.tsx`

### Bestaande aanpassingen
- `AdminLayout.tsx`: twee nieuwe menu-items (Planning, Financieel Dashboard)
- `autoTodoCreator.ts`: twee nieuwe auto-todo types + UI config
- `daily-reminders` edge function: post-uitvoering checks toevoegen
- `AdminDashboard.tsx`: PipelineFunnel component toevoegen
- Router: twee nieuwe routes registreren

### Edge function updates
- `daily-reminders/index.ts`: query items waar `executed_at` is gezet, controleer of feedback-todo of invoice-check-todo al bestaat, zo niet aanmaken
- Auto-resolve `post_execution_invoice_check` wanneer een `partner_purchase_invoice` wordt geregistreerd

