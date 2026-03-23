
Doen. Op basis van code, data en logs is een volledige status-sweep nu zinvol.

### Wat er nu concreet misgaat
Voor dit project lijkt er op dit moment niets meer naar externe partners verstuurd te worden:
- de 2 resterende “klaar om te versturen”-items zijn **bureau-items** (`Overtocht Harlingen → Vlieland` en retour), geen partner-items
- de knop **“Verstuur naar partners”** roept nu `accept-quote-proposal` aan
- die backend zoekt alleen items met `customer_approved_at`
- in dit project hebben die 2 items géén `customer_approved_at`
- edge logs bevestigen 2 no-op pogingen: `No customer-approved items found to send to partners`

Dus: de UI zegt “2 klaar”, maar backend kan en hoeft hier niets naar partners te sturen.

### Extra bevindingen uit de data
Er zijn bredere workflow-inconsistenties:
- 1 actief project heeft nog `quote_status = null`
- meerdere projecten staan op `akkoord_ontvangen`, maar hebben nog verborgen items zonder `customer_approved_at`
- tellingen en badges gebruiken niet overal dezelfde logica
- bureau-items en partner-items worden nu te vaak op één hoop gegooid

### Plan

#### 1. Statusmodel centraliseren
Eén gedeelde workflow-helper maken voor:
- projectfase: `concept → offerte_verstuurd → akkoord_ontvangen → av_getekend → afgerond`
- itemfase:
  - intern bureau-item
  - wacht op klant
  - klaar voor partner
  - al verstuurd
  - niet van toepassing

Daarmee halen we dubbele en conflicterende statuslogica weg uit:
- `src/lib/quoteItemSendStatus.ts`
- `src/pages/admin/AdminProjects.tsx`
- `src/components/admin/PipelineFunnel.tsx`
- `src/components/admin/ProjectCalendarView.tsx`
- `src/components/admin/ProjectDateListView.tsx`
- `src/components/admin/ProjectGanttChart.tsx`
- `src/hooks/useProgramStatus.ts`
- relevante klantportaal componenten

#### 2. “Verstuur naar partners” ontkoppelen van klantakkoord-functie
De huidige hergebruikte function is te verwarrend. Ik stel voor:
- `accept-quote-proposal` alleen voor **klantakkoord**
- nieuwe admin-only backendfunctie voor **daadwerkelijk versturen naar partners**

Die nieuwe flow:
- neemt alleen echte partner-items mee
- sluit `provider_id = 'bureau'` en `block_type = 'bureau'` uit
- geeft exact terug:
  - welke partners gemaild worden
  - welke items intern blijven
  - welke items nog niet verstuurd mogen worden
  - waarom iets niet meegaat

#### 3. Admin UI verbeteren op detailpagina
De knop op `AdminRequestDetail` vervangen door een controleerbare flow:
- eerst een dialog/sheet met:
  - partners die nu bericht krijgen
  - items per partner
  - interne bureau-items apart
  - items die nog wachten op klant apart
- pas daarna verzenden
- bij 0 verzendbare partner-items geen stille no-op meer, maar duidelijke uitleg

Voor dit soort projecten wordt de melding dan bijvoorbeeld:
- niet “2 onderdelen klaar om naar partners te sturen”
- maar “2 interne bureau-items nog in verwerking”

#### 4. Data opschonen / backfill
Een migratie/backfill uitvoeren om oude projecten recht te trekken:
- `quote_status = null` aanvullen naar correcte startstatus (minimaal `concept`)
- projecten met goedgekeurd programma maar verborgen partner-items normaliseren
- alleen waar nodig `customer_approved_at` aanvullen of de nieuwe verzendlogica daarop niet meer laten leunen

Doel: oude data past weer bij de uniforme workflow.

#### 5. Dashboard- en lijsttellingen gelijk trekken
Alle metrieken en badges baseren op dezelfde helperlogica:
- “klaar voor partners” = alleen echte partner-items
- bureau-items apart tellen
- null/legacy statuses niet meer als “klaar” laten verschijnen
- projectlijst, funnel, kalender, dashboard en detailpagina moeten hetzelfde verhaal vertellen

#### 6. Logies-statussen meteen meenemen
Bij dezelfde sweep ook de logiesstatussen nalopen, zodat alles consistent is met recente wijzigingen:
- `pending / submitted / selected / declined / rejected / expired / withdrawn`
- checken of badges, filters, dashboardtelling en communicatie-overzicht overal kloppen
- legacy/ongebruikte vertakkingen verwijderen

### Technische focus
Belangrijkste root cause:
- frontend-ready-state en backend-send-state gebruiken nu **verschillende criteria**

Die worden gelijkgetrokken door:
- één gedeelde status-helper
- één aparte admin-send functie
- expliciet onderscheid tussen:
  - partner-items
  - bureau-items
  - klantakkoord
  - partnernotificatie

### Bestanden
Waarschijnlijk in scope:
- `src/lib/quoteItemSendStatus.ts`
- nieuw: `src/lib/projectWorkflow.ts` of vergelijkbaar
- `src/pages/admin/AdminRequestDetail.tsx`
- `src/pages/admin/AdminProjects.tsx`
- `src/pages/admin/AdminDashboard.tsx`
- `src/components/admin/PipelineFunnel.tsx`
- `src/components/admin/ProjectCalendarView.tsx`
- `src/components/admin/ProjectDateListView.tsx`
- `src/components/admin/ProjectGanttChart.tsx`
- `src/hooks/useProgramStatus.ts`
- `src/components/customer-portal/ProgramIntroCard.tsx`
- `src/components/customer-portal/CustomerPortalSplash.tsx`
- `supabase/functions/accept-quote-proposal/index.ts`
- nieuw: aparte backendfunctie voor admin partnerverzending
- database migratie voor backfill / opschoning

### Resultaat
Na deze opschoning krijg je:
- één uniforme workflow
- geen “klik maar er gebeurt niets”-situaties meer
- altijd zichtbaar welke partners nog iets ontvangen
- correcte tellingen op detailpagina, projectenlijst en dashboard
- minder legacy-verwarring in code én data
