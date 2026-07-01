# Claudia slimmer: geen ruis over afgeronde projecten, geen overlap met werkbank

## Waarom
Op de screenshot toont Claudia 7 aanbevelingen, waarvan **4 pure facturatie-herhalingen** van projecten die al de status `ready_for_invoice` hebben én al een "Facturatie …" todo op de werkbank (linker kolom) hebben staan. Bovendien pushen we projecten die feitelijk in de afsluitfase zitten nog steeds als "actie deze week". Dat maakt Claudia luidruchtig en verlaagt vertrouwen in de urgent-labels.

## Wat verandert er

### 1. `supabase/functions/claudia-daily-scan/index.ts` — signalen inperken
- **`ready_for_invoice`-signaal verwijderen.** De `set-project-ready-for-invoice` edge function maakt al automatisch een `admin_todo` "Facturatie …" aan; die verschijnt in de werkbank-lijst en (bij overschrijding due_date) via het bestaande `todo_overdue`-signaal. Dubbele melding is overbodig.
- **Terminal-suppressie strenger:** de uitzondering `s.category !== "ready_for_invoice"` vervalt. Zodra `completion_status ∈ {ready_for_invoice, partially_invoiced, fully_invoiced, completed, cancelled, feedback_received}` of `status ∈ {cancelled, completed}`: álle Claudia-signalen voor dat project worden gedropt (net als bij snooze).
- **Dedupe tegen open todo's:** per project laden we of er een open `admin_todo` bestaat (`status ∈ {todo, in_progress}`) waarvan de `due_date` nog niet verstreken is. Zo ja → onderdruk alle overige (niet-`todo_overdue`) signalen voor dat project. Werkbank ís dan al de handelingsplek; Claudia herhaalt niet.
- **Harde cluster-cap:** na AI-prioritering per `project_id` maximaal 1 aanbeveling (behouden = hoogste priority). AI-instructie deed dit al "zacht"; we forceren het nu.

### 2. `supabase/functions/claudia-daily-scan/index.ts` — urgent = echt urgent
De system prompt urgentie-regel wordt:
- **urgent** alleen als: verloopt < 3 dagen zonder klant-akkoord, óf > €1.000 open > 21 dgn, óf klant-vertrouwen aantoonbaar op spel (customer_complaint categorie in toekomst) — én cooldown ≠ `hot`.
- **normal** = actie deze week.
- **info** = achtergrond, geen deadline.

Alles wat via de nieuwe dedupe al door de werkbank wordt afgevangen komt niet meer tot AI-prioritering, dus de urgent-badge in de header (`Claudia 7`) wordt betekenisvoller.

### 3. UI — `ClaudiaRecommendationsCard.tsx` (klein)
- Boven de lijst een sub-copyregel: "X onderdrukt (recent contact of open werkbank-taak)" i.p.v. alleen "signalen onderdrukt door recent contact".
- Geen visuele overhaul; alleen tekst.

## Bijwerkingen / niet in scope
- Werkbank-todo-generatie blijft ongewijzigd.
- `Claudia`-badgeteller (in header) reageert automatisch omdat hij `admin_recommendations` telt.
- Bestaande recommendations verdwijnen pas bij de volgende scan-run (of via "Run nu").

## Verificatie
- `supabase/functions/_shared/projectActivity.ts` tests uitbreiden met een case: terminal completion_status → alle categorieën gesuppressed (ook `ready_for_invoice`).
- Handmatig: "Run nu" op werkbank → verwacht dat de vier `Facturatie …` items uit de screenshot verdwijnen zolang er een openstaande admin_todo voor bestaat.
