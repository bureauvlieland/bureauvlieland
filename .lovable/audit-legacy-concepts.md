# Audit: legacy concepts to simplify

Inventarisatie van plekken waar `program_type` en bureau-als-partner workflow
nog onderscheid maken. Bron voor Fase 4 (bureau-rolfusie) en Fase 5 (één projectmodel).

## `program_type` als workflow-driver

Komt voor in:

- `src/types/programRequest.ts` — type-definitie (`self_service` / `quote` / `maatwerk_zakelijk` / `maatwerk_prive`)
- `src/hooks/useCustomerProgram.ts` — branching op type voor klantenportaal
- `src/hooks/useProgramStatus.ts` — status-resolutie verschilt per type
- `src/pages/admin/AdminRequestDetail.tsx` — UI-takken per type
- `src/pages/admin/AdminProjects.tsx` — filter & label per type
- `src/pages/admin/AdminProgramNew.tsx` — keuze-UI bij creatie
- `src/components/admin/WorkOverview.tsx` — kolom & sortering per type
- `src/components/admin/CopyFromProgramDialog.tsx` — kopieert type mee
- `src/components/configurator/RequestFormModal.tsx` — zet type bij submit
- `src/components/configurator/MaatwerkIntakeForm.tsx` — type = `maatwerk_*`
- `src/components/configurator/CheckoutContactForm.tsx` — type = `self_service`
- `src/lib/quoteItemSendStatus.ts` — branching
- `src/components/customer-portal/*` — verschillende splash + flow per type
- `src/pages/ProgrammaOpMaat.tsx` — submit met type=`maatwerk_*`

**Plan Fase 5**: vervang de waarde door één gedeeld concept "Project". Behoud kolom als `origin` (analytics-only metadata: `customer_form` / `admin_created` / `configurator` / `lodging_only`). Workflow-branches verwijderen.

## Bureau-als-partner

- `src/lib/projectWorkflow.ts` — `isBureauItem()` (al `@deprecated`)
- `src/types/buildingBlock.ts` — `block_type = "bureau"` enum
- `src/pages/admin/AdminRequestDetail.tsx` — UI-knoppen per provider_id="bureau"
- `src/pages/admin/AdminBuildingBlocks.tsx` — filter & badge per block_type
- `src/hooks/useCustomerProgram.ts` — verstopt bureau-items in klantview
- `src/components/configurator/CheckoutContactForm.tsx` — bureau-toevoegingen
- `src/components/admin/AdminAddCostSheet.tsx` — kosten via provider="bureau"
- `src/components/admin/AdminEditActivitySheet.tsx` — speciale flow
- `src/components/admin/AdminAiProgramDialog.tsx` — bureau in selectielijst
- `src/components/admin/ApplyTemplateDialog.tsx`
- `src/components/accommodation/AccommodationWizard.tsx`
- `src/components/admin/RequestCompletionStatus.tsx`
- `src/components/admin/BuildingBlockSheet.tsx`
- `src/components/admin/AdminAddActivitySheet.tsx`
- DB-trigger `guard_item_status_consistency` heeft expliciete bureau-bypass.

**Plan Fase 4**:
- Verwijder `isBureauItem()` helper.
- `block_type = "bureau"` blijft als leverancier-tag (informatief), niet workflow-bepalend.
- Bureau-acties als interne checklist in detailpaneel met statussen
  `te_plannen → geregeld → uitgevoerd → gefactureerd`.
- Partner-record `bureau` filteren uit partner-lijsten (`id !== 'bureau'`).

## Logies vs programma onderscheid in UI

- `src/pages/admin/AdminAccommodation.tsx` (apart overzicht — vervangt door Werkbank-filter)
- `src/pages/admin/AdminAccommodationDetail.tsx` (wordt embedded in detailpaneel-tab)
- Sidebar-item `Logies` → vervangen door filter in Werkbank.

**Plan Fase 3**: redirects van oude routes naar `/admin/werkbank?...`.
