

## Plan: MAP Planning integreren in Partner Portal

### Doel
Partners met een MijnActiviteitenPlanner (MAP) koppeling krijgen een planningsoverzicht in hun partnerportaal. Hierin zien ze hun MAP-activiteiten (bezetting) naast de maatwerkaanvragen van Bureau Vlieland, zodat ze in één oogopslag kunnen beoordelen of ze een aanvraag kunnen bevestigen.

### Huidige situatie
- 3 partners hebben een `map_tenant_slug` + `map_api_key`
- De `map-proxy` edge function haalt MAP data op (activiteiten + activiteitstypes)
- `useMapActivities` hook bestaat al voor de admin/configurator
- Het partner dashboard toont nu Bureau Vlieland items + aankomende activiteiten, maar geen MAP-data

### Voorstel

**Nieuwe pagina: `/partner/planning`**

Een gecombineerd weekoverzicht (agenda-stijl) dat twee datastromen samenvoegt:

1. **MAP-activiteiten** — via bestaande `map-proxy`, gefilterd op de partner's eigen `map_tenant_slug`
2. **Bureau Vlieland items** — de bestaande `PartnerItem[]` uit het dashboard (bevestigd/pending)

De weergave is een **weekkalender** met datumnavigatie, waarin per dag/tijdslot zichtbaar is:
- MAP-activiteiten (kleur A) met bezetting (`NumberOfPersonsBooked / MaxPersons`)
- Bureau Vlieland aanvragen (kleur B) met status-badge (pending/bevestigd/akkoord)

Partners kunnen direct vanuit de planning doorklikken naar een aanvraag om deze te bevestigen/afwijzen.

**Navigatie**
- Nieuw menu-item "Planning" in `PartnerLayout` sidebar, alleen zichtbaar voor partners met `map_tenant_slug`
- Icoon: `CalendarDays`
- Geplaatst na "Overzicht"

### Technische details

**Bestanden**

| Bestand | Wat |
|---|---|
| `src/pages/PartnerPlanning.tsx` (nieuw) | Pagina met weekoverzicht, datumnavigatie, gecombineerde data |
| `src/components/partner-portal/PartnerPlanningCalendar.tsx` (nieuw) | Weekkalender component die MAP + BV items rendert |
| `src/components/partner-portal/PartnerLayout.tsx` | Menu-item "Planning" toevoegen (conditoneel op `map_tenant_slug`) |
| `src/App.tsx` | Route `/partner/planning` toevoegen |

**Data ophalen**
- Partner's `map_tenant_slug` ophalen uit de `partners` tabel (al beschikbaar via auth)
- MAP activiteiten: hergebruik `useMapActivities` hook met partner's eigen slug + partnerId
- BV items: hergebruik bestaande dashboard fetch of directe query op `program_request_items`

**Weergave**
- Weekweergave met dag-kolommen (ma-zo)
- Vorige/volgende week navigatie
- Per activiteit: naam, tijdstip, bezetting
- Bureau Vlieland items met status-kleur en klik-actie
- Legenda voor MAP vs Bureau Vlieland items
- Samenvattingsrij bovenaan: totaal geboekt per dag

