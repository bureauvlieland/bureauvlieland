

## Plan: Status- en workflow-optimalisatie — uniforme projectpipeline

### Status: ✅ Uitgevoerd

### Doorgevoerde wijzigingen

1. **`completion_status === "completed"` bug gefixt** in PipelineFunnel, ProjectGanttChart, ProjectCalendarView, ProjectDateListView → nu `fully_invoiced`
2. **Dashboard stat-chips**: "Te bevestigen" filtert nu op daadwerkelijk verstuurde items (`skip_partner_notification = false`), links naar `/admin/projecten`
3. **AdminRequests.tsx verwijderd**, route `/admin/aanvragen` redirect naar `/admin/projecten`
4. **PipelineFunnel**: self-service projecten tellen nu als "Actief/AV" i.p.v. "Concept", maatwerk-specifieke offerte-logica toegevoegd
5. **getDerivedStatus**: self-service projecten categoriseren correct als "actief" i.p.v. "concept"
