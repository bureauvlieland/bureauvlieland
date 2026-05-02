## Doel

Het overzicht **Klantprojecten** (`/admin/projecten`) overzichtelijker maken door projecten die niet meer dagelijkse aandacht nodig hebben standaard weg te filteren, en de Facturatie-fase visueel beter zichtbaar te maken in de zijbalk.

## Wat gaan we doen

### 1. Standaard verbergen van Geannuleerd & Afgerond (kern)

In `src/pages/admin/AdminProjects.tsx`:

- **Standaardfilter**: bij laden tonen we alléén actieve projecten (alle stages **behalve** `geannuleerd` en `afgerond`). Dit is een "actief"-view.
- **Toggle "Toon archief"**: een schakelaar (Switch) naast de bestaande filters waarmee de gebruiker geannuleerde en afgeronde projecten alsnog kan tonen. Standaard uit.
- Wanneer de gebruiker expliciet `Geannuleerd` of `Afgerond` kiest in de status-dropdown, worden die projecten getoond ongeacht de toggle (filterkeuze wint).
- De **Pipeline Funnel** bovenin blijft de echte aantallen tonen per fase (inclusief Afgerond), maar krijgt een aparte rij/badge voor `Geannuleerd` (nu helemaal weggelaten in `stageCounts`). Klikken op `Afgerond` of `Geannuleerd` activeert dan ook automatisch het tonen van die rijen.
- De ondertitel wijzigt naar bv. *"Actieve klantopdrachten — geannuleerde en afgeronde projecten zijn standaard verborgen"* zodat duidelijk is waarom de lijst korter is.

### 2. Badge op "Facturatie" in de zijbalk

In `src/components/admin/AdminLayout.tsx`:

- Nieuwe hook `useInvoicingReadyCount()` (analoog aan `useOpenTodoCount` / `usePurchaseInvoiceInboxCount`) die telt hoeveel projecten `completion_status` = `ready_for_invoice` óf `partially_invoiced` hebben (programma + losse logies). Dit is precies de groep die in `AdminInvoicing.tsx` als "klaar voor facturatie" telt.
- Deze count tonen we als amber badge op het menu-item **Facturatie**, identiek aan hoe Taken en Inkoop-inbox dat al doen. Zo zie je in één oogopslag hoeveel projecten wachten op een factuur.

### 3. Extra UX-optimalisaties (kleine, zelfde scherm)

Deze maken het overzicht verder duidelijker zonder grote refactor:

- **Sortering**: standaardsortering op aankomende einddatum / activiteitsdatum (eerstvolgende boven), en pas binnen identieke datum op `created_at` desc. Nu staat alles op `created_at` waardoor lopende projecten ondersneeuwen.
- **Visuele groepering naar tijd**: subtiele scheidingslijntjes met labels *"Deze week"*, *"Deze maand"*, *"Later"*, *"In het verleden (nog open)"* in de tabelweergave. Helpt scannen.
- **"Verlopen / over tijd"-markering**: projecten waarvan de uitvoerdatum voorbij is maar status nog `av_getekend` of eerder is, krijgen een rood randje + waarschuwingsicoon. Dat zijn projecten die feitelijk vergeten worden.
- **Pipeline-funnel klikbaar 'Geannuleerd'**: nu telt de funnel cancelled niet mee; we voegen een aparte rustige (grijze) rij toe onderaan met aantal geannuleerd, alleen klikbaar — telt niet mee in "22 actieve projecten".
- **Snelfilter-chips**: bovenaan kleine chip-knoppen *"Mijn actiepunten"* (= projecten met `items_not_sent > 0`, vervallen logies-deadline, of wachten op offerte > 7 dagen). Eén klik = alle "iets te doen"-projecten.
- **Tellingen bij filters**: in de status-dropdown het aantal per status tussen haakjes tonen (bv. *"Concept (7)"*) zodat je weet wat een filterkeuze oplevert.

### 4. Nice-to-have (alleen als gewenst)

- Knop *"Exporteer huidige selectie als CSV"* voor maandrapportage van actieve projecten.
- Kolomzichtbaarheid-menu (toggle Datum / Personen / Logies kolommen) voor smallere schermen.

## Technische details

**Bestanden die gewijzigd worden:**
- `src/pages/admin/AdminProjects.tsx` — filterlogica, toggle, sortering, groepering, snelfilter-chips, statuscount in dropdown.
- `src/components/admin/PipelineFunnel.tsx` — aparte rij voor Geannuleerd, klik-handling.
- `src/components/admin/AdminLayout.tsx` — badge op Facturatie.
- `src/hooks/useInvoicingReadyCount.ts` (nieuw) — query op `program_requests` + losse logies waar `completion_status in ('ready_for_invoice','partially_invoiced')`.

**Geen DB-migraties nodig** — alle vereiste velden (`completion_status`, `program_status`, `accommodation_status`) bestaan al en worden in `getDerivedStatus()` gebruikt.

**Geen breaking changes** — bestaande URL's en filterstaten blijven werken; de toggle is puur een visuele standaardinstelling.

## Vragen voor jou

1. **Toggle-naam**: liever *"Toon archief"*, *"Toon afgerond/geannuleerd"*, of *"Toon alles"*?
2. **Snelfilter-chips & tijd-groepering**: meenemen in dezelfde ronde, of eerst alleen de filter + badge en de rest later?
3. **Nice-to-have CSV-export en kolomtoggle**: nu meenemen of bewaren?

Geef akkoord (of feedback per punt) en ik implementeer.
