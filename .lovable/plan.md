

## Plan: PipelineFunnel verplaatsen naar Projectenoverzicht met interactieve filtering

### Probleem
1. **PipelineFunnel staat op het dashboard** maar hoort bij het projectenoverzicht
2. **Statussen komen niet overeen** — de funnel toont "Akkoord" en "Facturatie", maar het statusfilter-dropdown mist "Akkoord" en heeft "Actief" (dat geen echte derived status is)
3. **Funnel is niet interactief** — klikken linkt naar `/admin/projecten` maar filtert niet

### Oplossing

#### 1. PipelineFunnel verplaatsen
- **Verwijderen** uit `AdminDashboard.tsx`
- **Toevoegen** aan `AdminProjects.tsx`, boven de filters, ter vervanging van de huidige 4 stat-cards

#### 2. PipelineFunnel interactief maken
- Component krijgt een `onStageClick(stageKey: string)` callback prop
- Klikken op een balk zet het `statusFilter` in AdminProjects
- Actieve stage wordt visueel gemarkeerd
- Nogmaals klikken reset naar "all"

#### 3. Statussen synchroniseren
De funnel en het dropdown krijgen exact dezelfde stages:

| Key | Label | Funnel | Dropdown |
|-----|-------|--------|----------|
| `concept` | Concept | ✅ | ✅ |
| `offerte_verstuurd` | Offerte verstuurd | ✅ | ✅ |
| `akkoord_ontvangen` | Akkoord ontvangen | ✅ | ✅ (nu ontbreekt) |
| `av_getekend` | AV getekend | ✅ | ✅ |
| `facturatie` | Facturatie | ✅ | ✅ (nu ontbreekt) |
| `afgerond` | Afgerond | ✅ | ✅ |
| `geannuleerd` | Geannuleerd | ❌ (niet in funnel, apart) | ✅ |

- **Verwijderen** uit dropdown: "Actief" (geen derived status)
- **Toevoegen** aan dropdown: "Akkoord ontvangen", "Facturatie"
- `getDerivedStatus()` uitbreiden met `facturatie` als apart stadium (nu ontbreekt in de type)

### Bestanden

1. **`src/components/admin/PipelineFunnel.tsx`** — accepteert `onStageClick` + `activeStage` props; verwijdert eigen data-fetching (krijgt data van parent of hergebruikt bestaande query); visuele highlight voor actieve stage
2. **`src/pages/admin/AdminProjects.tsx`** — importeert PipelineFunnel, vervangt stat-cards, koppelt aan `statusFilter` state; synchroniseert dropdown-opties; voegt `facturatie` toe aan `DerivedStatus` type en `getDerivedStatus()`
3. **`src/pages/admin/AdminDashboard.tsx`** — verwijdert PipelineFunnel import en gebruik

### Technische details

- `DerivedStatus` type uitbreiden: `"facturatie"` toevoegen
- `getDerivedStatus()`: facturatie-check (`ready_for_invoice` / `partially_invoiced`) vóór `afgerond` check verplaatsen
- PipelineFunnel hergebruikt de `admin-projects-unified` query data via props in plaats van eigen query, zodat tellingen 100% consistent zijn met de tabel
- Funnel keys moeten exact matchen met `DerivedStatus` values voor directe filter-koppeling

