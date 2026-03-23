## Plan: Status- en workflow-optimalisatie — VOLTOOID

### Wat is gedaan

1. **`src/lib/projectWorkflow.ts`** — Nieuwe centrale helper met:
   - `getProjectPipelineStage()` voor uniforme projectfase-bepaling
   - `getItemSendPhase()` met expliciet onderscheid bureau-items vs partner-items
   - `getItemSendCounts()` voor correcte tellingen

2. **`supabase/functions/send-items-to-partners/`** — Nieuwe admin-only edge function:
   - Stuurt alleen naar echte partner-items (sluit `provider_id = 'bureau'` uit)
   - Ondersteunt `dry_run` mode voor preview
   - Geeft exact terug welke partners genotificeerd worden

3. **`src/pages/admin/AdminRequestDetail.tsx`** — Verbeterde verzendflow:
   - "Verstuur naar partners" knop toont nu eerst een review-dialog
   - Dialog toont welke partners bericht krijgen + welke items intern blijven
   - Bureau-items krijgen een aparte informatiebanner
   - Geen stille no-ops meer

4. **`src/pages/admin/AdminDashboard.tsx`** — Correcte metrieken:
   - "Te bevestigen" telt nu alleen items van actieve projecten die daadwerkelijk verstuurd zijn
   - "Bevestigd" telt alleen items van actieve projecten
   - Logies-statussen gecorrigeerd (`processing`/`pending` i.p.v. `submitted`, `accepted` i.p.v. `quoted`)

5. **Data backfill** — `quote_status = 'concept'` gezet voor het laatste project met `null`
