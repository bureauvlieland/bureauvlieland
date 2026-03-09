

## Projecten: Gantt Chart, Kalender en Tijdlijn weergaven

### Huidige situatie

De `AdminProjects.tsx` pagina toont projecten in een platte tabel met kolommen voor type, status, referentie, klant, logies, activiteiten, datums en personen. Er is geen visuele tijdlijn of kalenderweergave.

### Wat we gaan bouwen

Drie weergaven via tabs bovenaan de projectenpagina, naast de bestaande tabelweergave:

**1. Tabel (huidige weergave)** — behouden zoals nu

**2. Gantt Chart weergave**
- Horizontale tijdlijn met weken/maanden als kolommen
- Elke rij = een project (klantnaam + referentie)
- Horizontale balken tonen de looptijd per project (van eerste datum tot laatste datum / vertrekdatum)
- Binnen elke projectrij: sub-balken voor individuele activiteiten (items) met hun status als kleur (pending=amber, confirmed=groen, cancelled=rood)
- Logies-periode als aparte balk in blauw/indigo
- Klikbaar: balk opent project detail
- Scroll horizontaal door de tijdlijn, auto-focus op huidige week
- Pure CSS/div-gebaseerd (geen externe library nodig)

**3. Kalender weergave**
- Maandelijkse grid (zoals een normale kalender)
- Per dag: gestapelde chips met projectnamen die op die dag vallen
- Kleurcodering per status (concept=grijs, offerte verstuurd=blauw, AV getekend=groen, etc.)
- Navigatie: vorige/volgende maand
- Klikbaar: chip opent project detail

**4. Lijstweergave op datum**
- Chronologische lijst gegroepeerd per datum
- Per datum: alle projecten die op die dag actief zijn (arrival, departure, of activiteitsdatum)
- Compacte kaartjes met klantnaam, referentie, status, en wat er die dag gebeurt
- Scrollbaar met "vandaag" marker

### Technische aanpak

| Wat | Detail |
|---|---|
| Bestand | `src/pages/admin/AdminProjects.tsx` — uitbreiden met Tabs component |
| Nieuwe componenten | `src/components/admin/ProjectGanttChart.tsx`, `src/components/admin/ProjectCalendarView.tsx`, `src/components/admin/ProjectDateListView.tsx` |
| Data | Hergebruik van de bestaande `useQuery` in AdminProjects; voor Gantt ook `program_request_items` ophalen met datums |
| Libraries | Geen nieuwe dependencies — pure Tailwind CSS voor Gantt balken, bestaande Calendar component voor kalendernavigatie |
| Filters | Alle bestaande filters (zoeken, type, status) gelden voor alle weergaven |

### Gantt berekening

Per project wordt de tijdlijn bepaald door:
- `selected_dates[0]` tot `selected_dates[last]` (programma datums)
- `accommodation_arrival` tot `accommodation_departure` (logies)
- Minimum van beide = projectstart, maximum = projecteinde
- Items worden gepositioneerd op basis van `day_index` relatief aan de startdatum

### Kalender berekening

Per project: alle datums uit `selected_dates` + alle datums in het bereik `accommodation_arrival` t/m `accommodation_departure` worden als "actieve dagen" gemarkeerd in de maandgrid.

