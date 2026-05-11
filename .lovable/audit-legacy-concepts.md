# Audit: legacy concepts to simplify

Inventarisatie van plekken waar `program_type` en bureau-als-partner workflow
nog onderscheid maken. Bron voor Fase 4 (bureau-rolfusie) en Fase 5 (één projectmodel).

Beslissing per call-site: **behoud** / **verwijder** / **vervang door X**.

---

## 1. `program_type` als workflow-driver

Streefbeeld Fase 5: één gedeeld "Project"-concept. Kolom blijft als
`origin` (`customer_form` / `admin_created` / `configurator` / `lodging_only`)
puur voor analytics; geen workflow-branches meer.

| Call-site | Beslissing | Toelichting |
|---|---|---|
| `src/types/programRequest.ts` (`ProgramType`) | **vervang door `Origin`** | Hernoem type naar `ProjectOrigin`, behoud waarden als label-set. |
| `src/hooks/useCustomerProgram.ts` | **verwijder branching** | Klantportaal toont één flow; alleen `origin` als badge in admin. |
| `src/hooks/useProgramStatus.ts` | **verwijder branching** | Status-resolutie gaat al via `getProjectPipelineStage` — type is overbodig. |
| `src/pages/admin/AdminRequestDetail.tsx` | **vervang door tab-conditie** | UI-takken voor `maatwerk` worden één tab in detailpaneel. |
| `src/pages/admin/AdminProjects.tsx` | **verwijder** | Pagina vervangen door Werkbank; geen aparte type-filter meer nodig. |
| `src/pages/admin/AdminProgramNew.tsx` | **behoud (tijdelijk)** | Admin kiest origin bij creatie; later UI vereenvoudigen. |
| `src/components/admin/WorkOverview.tsx` | **verwijder** | Werkbank vervangt dit overzicht. |
| `src/components/admin/CopyFromProgramDialog.tsx` | **vervang door `origin = 'admin_created'`** | Gekopieerde projecten krijgen vaste origin. |
| `src/components/configurator/RequestFormModal.tsx` | **vervang door `origin = 'customer_form'`** | Geen workflow-impact, alleen label. |
| `src/components/configurator/MaatwerkIntakeForm.tsx` | **vervang door `origin = 'configurator'` + `is_maatwerk` flag** | Maatwerk wordt een attribuut, geen aparte flow. |
| `src/components/configurator/CheckoutContactForm.tsx` | **vervang door `origin = 'configurator'`** | |
| `src/lib/quoteItemSendStatus.ts` | **verwijder branching** | Send-status onafhankelijk van type. |
| `src/components/customer-portal/*` | **verwijder type-splash** | Eén klantflow, micro-copy via `origin` mag. |
| `src/pages/ProgrammaOpMaat.tsx` | **vervang door `origin = 'configurator'` + `is_maatwerk = true`** | |

**Migratiestappen Fase 5:**
1. Toevoegen kolom `origin TEXT` (nullable) en backfill: `program_type` 1-op-1 mappen.
2. Refactor naar `origin` zonder branching; `program_type` blijft tijdelijk staan.
3. Na deploy verifiëren met regressie-checklist; pas dan `program_type` droppen.

---

## 2. Bureau-als-partner

Streefbeeld Fase 4: bureau-acties als interne checklist met statussen
`te_plannen → geregeld → uitgevoerd → gefactureerd`. `block_type='bureau'`
blijft als leverancier-tag (informatief), niet workflow-bepalend.

| Call-site | Beslissing | Toelichting |
|---|---|---|
| `src/lib/projectWorkflow.ts` (`isBureauItem`) | **verwijder** | Helper is al `@deprecated`. Vervang door directe `block_type === 'bureau'` check op renderniveau. |
| `src/types/buildingBlock.ts` (`block_type`-enum) | **behoud** | `bureau` blijft als waarde, krijgt geen workflow-rol meer. |
| `src/pages/admin/AdminRequestDetail.tsx` | **vervang door checklist-component** | Bureau-knoppen worden interne checklist-rij. |
| `src/pages/admin/AdminBuildingBlocks.tsx` | **behoud filter** | Filter "type=bureau" blijft handig voor admin. |
| `src/hooks/useCustomerProgram.ts` | **behoud verstop-logica** | Bureau-items blijven onzichtbaar voor klant. |
| `src/components/configurator/CheckoutContactForm.tsx` | **vervang door post-submit hook** | Bureau-items worden via edge function toegevoegd, niet inline. |
| `src/components/admin/AdminAddCostSheet.tsx` | **behoud + relabel** | "Bureau-kosten" wordt "Interne post"; provider blijft `bureau`. |
| `src/components/admin/AdminEditActivitySheet.tsx` | **vereenvoudig** | Speciale flow weg; gebruikt zelfde sheet als andere items. |
| `src/components/admin/AdminAiProgramDialog.tsx` | **behoud** | AI mag bureau-blokken voorstellen. |
| `src/components/admin/ApplyTemplateDialog.tsx` | **behoud** | Templates kennen bureau-items (ferry/bikes). |
| `src/components/accommodation/AccommodationWizard.tsx` | **behoud** | Logies-wizard verandert niet in Fase 4. |
| `src/components/admin/RequestCompletionStatus.tsx` | **vervang door checklist-status** | Bureau-completion via interne checklist. |
| `src/components/admin/BuildingBlockSheet.tsx` | **behoud** | Editor blijft type-agnostisch. |
| `src/components/admin/AdminAddActivitySheet.tsx` | **behoud** | Toevoeg-flow blijft hetzelfde. |
| DB-trigger `guard_item_status_consistency` (bureau-bypass) | **behoud** | Bypass blijft logisch (geen partner-traject). |
| Partner-record `id='bureau'` in lijsten | **filter eruit** | Toevoegen `id !== 'bureau'` in alle partner-selectors. |

**Memory-impact Fase 4:**
- Raakt `mem://business/bureau-internal-item-workflow` (filtering `day_index = -1` blijft).
- Raakt `mem://business/managed-services-transition` (ferry/bikes als bureau-items blijven).
- Raakt `mem://business/invoicing-centralization-rules` (bureau_central blijft leidend).

---

## 3. Logies vs programma onderscheid in UI

| Call-site | Beslissing | Toelichting |
|---|---|---|
| `src/pages/admin/AdminAccommodation.tsx` | **redirect → Werkbank** | `?kind=logies_only`; pagina blijft als `-legacy` route bestaan. |
| `src/pages/admin/AdminAccommodationDetail.tsx` | **embed in detailpaneel-tab** | Bestaande detailpagina via `?id=...` blijft werken voor diepe links. |
| Sidebar-item `Logies` | **al verwijderd** | Vervangen door `?kind=logies_only` in Werkbank. |

---

## Regressie-checklist (verplicht vóór Fase 4 én vóór Fase 5)

Vink bij elke fase af; plak resultaat in chat.

1. **Configurator → checkout**: één activiteit + ferry → checkout → bevestigingsmail.
2. **Klant-portal**: open token-link van bestaand programma → zie items, geen bureau-items zichtbaar.
3. **Partner-portal**: log in als partner → zie eigen items, geen klant-PII.
4. **Logies-aanvraag**: open token-link → zie offertes, kies er één → status update.
5. **Bestaande factuur**: open `bureau_invoice` PDF → totalen kloppen, btw correct.
6. **Werkbank**: actief project openen → alle 5 tabs leveren data of nette lege staat.
7. **Archief**: `?archief=1` → geannuleerd/verwijderd zichtbaar, badge "Gearchiveerd" op detail.
8. **Memory-check**: lopen wijzigingen synchroon met `mem://index.md` Core-regels?

Vangt ervaring leert ~80% van regressies in 5–10 min.
