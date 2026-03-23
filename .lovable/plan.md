

## Plan: Status- en workflow-optimalisatie — uniforme projectpipeline

### Analyse van huidige situatie

Na uitgebreide analyse van de codebase zijn er meerdere inconsistenties en verouderde structuren gevonden:

---

### 1. Dubbele pagina: `AdminRequests.tsx` vs `AdminProjects.tsx`

**Probleem**: Er bestaan twee lijstpagina's voor projecten:
- `/admin/aanvragen` → `AdminRequests.tsx` (349 regels, legacy, toont alleen `program_requests`, geen `program_type`/`quote_status` awareness)
- `/admin/projecten` → `AdminProjects.tsx` (980 regels, uniforme weergave, combineert logies + activiteiten)

De oude `AdminRequests` is een verouderde tabel die geen maatwerk/quote-workflow toont, geen logies integreert, en nog steeds de ruwe `status` waarde ("active"/"cancelled") toont i.p.v. de afgeleide pipeline-status.

**Actie**: `AdminRequests.tsx` kan verwijderd worden. De route `/admin/aanvragen` wordt een redirect naar `/admin/projecten`. Links die naar `/admin/aanvragen/:id` verwijzen hoeven niet te veranderen — die route naar `AdminRequestDetail` blijft bestaan.

---

### 2. Dashboard-metrieken kloppen niet

**Probleem**: De stat-chips op het dashboard gebruiken verouderde tellingen:
- "Actieve aanvragen" telt alle `program_requests` met `status === "active"`, zonder onderscheid maatwerk/self-service
- "Te bevestigen" telt **alle** items met `status === "pending"` over alle projecten heen — inclusief items die nog niet naar partners verstuurd zijn (`skip_partner_notification: true`). Dit geeft een opgeblazen getal
- "Bevestigd" telt alle items met `status === "confirmed"` — ook van afgeronde/gefactureerde projecten
- Links verwijzen naar `/admin/aanvragen` (legacy pagina) i.p.v. `/admin/projecten`

**Actie**:
- "Te bevestigen" moet filteren op items die daadwerkelijk verstuurd zijn naar partners (`skip_partner_notification = false OR skip_partner_notification IS NULL`)
- Links naar `/admin/aanvragen` omzetten naar `/admin/projecten`
- Overweeg "Bevestigd" te beperken tot actieve projecten (niet `deleted`/`cancelled`)

---

### 3. Pipeline-funnel logica inconsistenties

**Probleem**: De `PipelineFunnel` en `getDerivedStatus` in AdminProjects hebben subtiele afwijkingen:
- `PipelineFunnel` kent `completion_status === "completed"` als "Afgerond" en `ready_for_invoice`/`invoiced` als "Facturatie" — maar `completion_status === "completed"` bestaat niet als database-waarde (de types zijn `in_progress`, `ready_for_invoice`, `partially_invoiced`, `fully_invoiced`)
- Self-service projecten vallen altijd in "Concept" of "Actief" omdat ze geen `quote_status` hebben, waardoor de pipeline misleidend is
- De pipeline mist een "Akkoord ontvangen" stap (`quote_status === "akkoord_ontvangen"`) die na het tekenen van AV de aparte fase is vóór definitieve bevestiging

**Actie**:
- Verwijder `completed` check (bestaat niet in DB), gebruik i.p.v. `fully_invoiced` als eindstatus
- Voeg self-service projecten logischer in: ze slaan de offerte-fase over, maar volgen dezelfde pipeline (concept → actief → AV → facturatie)
- Uniformeer de `getDerivedStatus` functie zodat deze zowel voor self-service als maatwerk juist werkt

---

### 4. Verwarring tussen `program_type` differentiatie in code

**Probleem**: Overal in de code wordt `isQuoteOrMaatwerk()` of `program_type === "self_service"` gecheckt om gedrag te splitsen. Dit zorgt voor:
- Dubbele code-paden voor banners, statussen, en workflows
- Inconsistente UI (self-service toont andere banners dan maatwerk bij dezelfde werkelijke status)
- `quote_status` is `null` voor self-service projecten, waardoor pipeline-logica deze niet kan categoriseren

**Actie — uniforme werkwijze**:
- Geef self-service projecten bij creatie een impliciete `quote_status = "akkoord_ontvangen"` (klant heeft immers zelf aangevraagd, dus akkoord is impliciet)
- Alternatief: maak de pipeline-categorisering explicieter door `program_type`-onafhankelijke status te gebruiken. Bijv. een nieuw veld `pipeline_stage` dat door beide flows gezet wordt
- Op korte termijn: pas `getDerivedStatus` en `PipelineFunnel` aan om self-service correct te categoriseren zonder `quote_status`

---

### 5. `completion_status` mismatch

**Probleem**: De database heeft `completion_status` met default `'in_progress'`, maar de `CompletionStatus` type in `bureauInvoice.ts` definieert 4 waarden: `in_progress`, `ready_for_invoice`, `partially_invoiced`, `fully_invoiced`. De pipeline zoekt naar `"completed"` — een waarde die **niet** in deze set zit.

**Actie**: Verwijder de `"completed"` check uit pipeline/gantt/calendar/datelist en gebruik `fully_invoiced` als de afgeronde status.

---

### 6. Code opschoning

| Bestand | Actie | Reden |
|---------|-------|-------|
| `src/pages/admin/AdminRequests.tsx` | Verwijderen | Vervangen door `AdminProjects.tsx` |
| Route `/admin/aanvragen` | Redirect naar `/admin/projecten` | Uniforme navigatie |
| ~20 links naar `/admin/aanvragen` (excl `:id`) | Wijzigen naar `/admin/projecten` | Consistentie |
| `PipelineFunnel.tsx` | Fix `completed` → `fully_invoiced` | Bug |
| `ProjectGanttChart.tsx` | Idem | Bug |
| `ProjectCalendarView.tsx` | Idem | Bug |
| `ProjectDateListView.tsx` | Idem | Bug |
| Dashboard stat-chips | Fix filters en links | Kloppende metrieken |

---

### 7. Self-service projecten stroomlijning

Concreet voorstel voor uniforme pipeline:

```text
┌──────────┐   ┌────────────────┐   ┌─────────────┐   ┌──────────────┐   ┌────────────────┐
│ Concept   │──▶│ Offerte verst. │──▶│ AV getekend  │──▶│ Klaar v.fact │──▶│ Gefactureerd   │
│           │   │ (maatwerk)     │   │              │   │              │   │                │
└──────────┘   └────────────────┘   └─────────────┘   └──────────────┘   └────────────────┘
     │                                    ▲
     │         (self-service)             │
     └────────────────────────────────────┘
     Direct naar 'Actief' / 'AV getekend' zodra 
     klant voorwaarden accepteert
```

Self-service projecten beginnen als "Actief" (niet "Concept") en slaan "Offerte verstuurd" over.

---

### Samenvatting aanpassingen

**Fase 1 — Bugfixes en opschoning** (direct):
1. Fix `completion_status === "completed"` bug in 4 bestanden
2. Fix dashboard stat-chip filters (exclude niet-verstuurde items van "Te bevestigen")
3. Fix dashboard links `/admin/aanvragen` → `/admin/projecten`
4. Route `/admin/aanvragen` redirect naar `/admin/projecten` (behoud `:id` route)
5. Verwijder `AdminRequests.tsx`

**Fase 2 — Pipeline uniformering**:
6. Pas `getDerivedStatus` aan: self-service projecten categoriseren als "Actief" i.p.v. "Concept"
7. Pas `PipelineFunnel` aan: voeg "Actief" stage toe voor self-service
8. Update links in ~10 bestanden van `/admin/aanvragen` naar `/admin/projecten`

### Bestanden (geschat)
- `src/pages/admin/AdminRequests.tsx` — verwijderen
- `src/App.tsx` — route aanpassen
- `src/pages/admin/AdminDashboard.tsx` — stat-chip fixes
- `src/components/admin/PipelineFunnel.tsx` — completion_status fix + self-service
- `src/pages/admin/AdminProjects.tsx` — getDerivedStatus fix
- `src/components/admin/ProjectGanttChart.tsx` — completion_status fix
- `src/components/admin/ProjectCalendarView.tsx` — completion_status fix
- `src/components/admin/ProjectDateListView.tsx` — completion_status fix
- ~10 bestanden met `/admin/aanvragen` links → `/admin/projecten`

