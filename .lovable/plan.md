## Doel

Eén pagina **Projecten & Planning** in het admin-menu (vervangt de huidige Planning-pagina) met drie tabs:

1. **Lijst** — alle lopende projecten gesorteerd op eerstvolgende aankomst
2. **Kalender** — de bestaande weekplanning
3. **Logies** — alle logies-aanvragen in dezelfde lijststijl

Werkbank blijft onveranderd voor "wat vraagt aandacht". Deze pagina is puur een operationeel overzicht.

## Navigatie

- Sidebar-item **Planning** → hernoemen naar **Projecten** (icoon `CalendarDays` / `ListChecks`), URL `/admin/projecten`.
- `/admin/projecten` is nu nog een redirect naar `/admin/werkbank` → wordt de nieuwe pagina.
- `/admin/planning` → redirect naar `/admin/projecten?tab=kalender` (back-compat).
- `/admin/projecten-legacy` blijft bestaan als safety-net (niet in menu).

## Pagina-layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Projecten & Planning                              [+ Nieuw] │
│ ─────────────────────────────────────────────────────────── │
│ [Lijst] [Kalender] [Logies]      🔍 zoek    [Type ▾] □ archief│
└─────────────────────────────────────────────────────────────┘
```

URL-state: `?tab=lijst|kalender|logies`, `?q=`, `?type=all|programma|combi`, `?archief=1`.

### Tab "Lijst" — schoon & compact

Tabel gesorteerd op eerstvolgende datum (aankomst logies of eerste `selected_dates`). Gegroepeerd op tijd-bucket: **Deze week → Deze maand → Later → Zonder datum**. Default verbergt `afgerond` + `geannuleerd` (zichtbaar onder archief-toggle).

Kolommen:
| Datum | Ref | Klant / bedrijf | Pers. | Type | Status | Readiness |
|---|---|---|---|---|---|---|

- **Datum**: aankomst + duur (`12 jun · 3 dgn`); rij krijgt rode stip als datum verstreken.
- **Type**-badge: Programma / Logies / Combi.
- **Status**-badge: derived status (concept → offerte verstuurd → akkoord → AV → facturatie → afgerond), bestaande logica hergebruiken uit `AdminProjects.tsx` (`getDerivedStatus`).
- **Readiness**: kleine progress-bar `done/total` (zelfde helper).
- Klik op rij → `/admin/projecten/:id`.

Geen PipelineFunnel, geen Gantt, geen uitklap-rij, geen bulk-acties — die blijven op de legacy-pagina.

### Tab "Kalender"

Hergebruikt component `AdminPlanning` 1-op-1 (huidige weekgrid met activiteiten + aankomst/vertrek). Wordt geëxtraheerd naar `WeekPlanningView.tsx` zodat de pagina-chrome (titel/tabs) niet dubbel staat.

### Tab "Logies"

Zelfde tabel-component als Lijst, maar gevoed met `accommodation_requests` (alle, ook combi). Kolom **Type** wordt **Status logies** (`submitted` / `quoted` / `selected` / `cancelled`). Datum = aankomst. Klik → `/admin/projecten/:linked_program_id` als gekoppeld, anders `/admin/logies/:id`.

## Implementatie

**Nieuwe bestanden**
- `src/pages/admin/AdminProjectsOverview.tsx` — pagina-shell met tabs + URL-sync.
- `src/components/admin/projecten/ProjectsListTable.tsx` — herbruikbare tabel (props: `rows`, `kind: "projecten" | "logies"`).
- `src/components/admin/projecten/WeekPlanningView.tsx` — extractie van bestaande `AdminPlanningContent` body (zonder `AdminLayout` + helmet wrapper).
- `src/lib/getProjectsOverview.ts` — query-helper die programma's + logies joint en mapt naar één rij-type met `earliestDate`, `derivedStatus`, `readiness`. Hergebruikt logica uit `AdminProjects.tsx`.

**Aanpassingen**
- `src/App.tsx` — route `/admin/projecten` → `AdminProjectsOverview`; `/admin/planning` → `<Navigate to="/admin/projecten?tab=kalender" replace />`.
- `src/components/admin/AdminLayout.tsx` — sidebar-item label/icon ("Projecten").
- `AdminPlanning.tsx` — wordt dunne wrapper of verwijderd (route is redirect).

**Hergebruik (kopiëren naar helper, niet importeren uit legacy-pagina)**
- `getDerivedStatus`, `DERIVED_STATUS_CONFIG`, `getEarliestProjectDate`, `getReadinessScore`, `getTimeBucket`, `TIME_BUCKET_LABEL` uit `AdminProjects.tsx` → naar `src/lib/projectStatus.ts` (deduped). Legacy importeert daarna uit deze helper.

## Out of scope
- Geen wijzigingen aan Werkbank, detailpagina, of dataflow.
- Geen nieuwe DB-velden of edge-functies.
- Bulk-delete en pipeline-funnel blijven op `/admin/projecten-legacy`.
