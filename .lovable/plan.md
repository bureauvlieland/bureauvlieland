## Doel
Het admin-overzicht **Logies Aanvragen** (`/admin/logies`) toont nu álles door elkaar – ook geannuleerde en al lang afgehandelde aanvragen. We splitsen het op in een **actief werkoverzicht** en een **archief**, en koppelen de logiesstatus automatisch aan de afronding van het bijbehorende programma.

## Wat verandert er functioneel

### 1. Standaardweergave: alleen actieve aanvragen
Het hoofdoverzicht toont per default alleen aanvragen die nog werk vereisen:
- statussen `submitted`, `processing`, `quoted`, `accepted`
- **én** waarvan het gekoppelde programma nog niet is afgerond (`completion_status` ≠ `fully_invoiced`)
- **én** die zelf nog niet zijn afgerond (nieuw veld `completion_status`)

Verborgen uit de standaardweergave:
- `cancelled` / `expired` → zichtbaar in **Archief → Geannuleerd**
- `completion_status = 'fully_invoiced'` → zichtbaar in **Archief → Gerealiseerd**

### 2. Nieuwe tab/pagina: Archief
Toggle bovenin de pagina: **Actief** | **Archief**. In het archief twee subfilters:
- **Gerealiseerd** (gekoppeld programma is gefactureerd, of logies zelf is afgesloten)
- **Geannuleerd / Verlopen**

In het archief blijven dezelfde kolommen, zoekfunctie en detaillink (`Bekijken`) werken. Vanuit het archief kan een admin een aanvraag handmatig **heropenen** (status terug naar `processing`).

### 3. Automatische realisatie via gekoppeld programma
Logies kent al een `completion_status` (in_progress / partially_invoiced / ready_for_invoice / fully_invoiced) en `completed_at`. Die zetten we nu actief in:

- Wanneer een `program_request.completion_status` op `fully_invoiced` komt (handmatig via `set-project-completion` of automatisch via `recalculate_program_completion_status`), wordt het gelinkte `accommodation_request` (via `linked_program_id`) ook op `completion_status = 'fully_invoiced'` + `completed_at = now()` gezet, mits er een geaccepteerde offerte is.
- Wanneer het programma wordt **heropend**, wordt de logies ook teruggezet (`completion_status = 'in_progress'`, `completed_at = null`).
- Voor losse logiesaanvragen zonder programma: handmatig afronden blijft mogelijk via de detailpagina (knop "Markeer als gerealiseerd").

### 4. Stats-tegels
De vier tegels bovenin (Totaal / Nieuw / In behandeling / Offertes verstuurd) tellen alleen over **actieve** aanvragen. In de archieftab tonen we andere tegels: **Gerealiseerd**, **Geannuleerd**, **Totaal in archief**.

## Technische uitwerking

### Database (migratie)
1. Trigger op `program_requests` (AFTER UPDATE OF completion_status):
   - Bij overgang naar `fully_invoiced`: update gekoppelde `accommodation_requests` (`linked_program_id = NEW.id`) → `completion_status='fully_invoiced'`, `completed_at=now()`.
   - Bij overgang vàn `fully_invoiced` naar iets anders (heropenen): zet logies terug op `in_progress`, `completed_at=null`.
2. Geen schemawijziging nodig: `completion_status` en `completed_at` bestaan al op `accommodation_requests`.

### Edge function
- `set-project-completion`: bij `entity_type='program'` ook de gekoppelde logies meenemen (zelfde reden/audit log).

### Frontend (`src/pages/admin/AdminAccommodation.tsx`)
- Tabs **Actief / Archief** (Tabs uit shadcn).
- Query splitsen: actieve query filtert op `completion_status is null OR != 'fully_invoiced'` én status not in (`cancelled`,`expired`). Archiefquery doet het tegenovergestelde, met sub-filter Gerealiseerd/Geannuleerd.
- Joinen met `program_requests.completion_status` zodat we actieve aanvragen waarvan het programma is afgerond ook uit het actieve overzicht houden.
- Stats-tegels per tab herberekenen.
- Statusbadge uitbreiden met `Gerealiseerd` (groen) wanneer `completion_status='fully_invoiced'`.

### Detailpagina (`AdminAccommodationDetail`)
- Toon afronding-blok: status + `completed_at` + knop **Markeer als gerealiseerd** / **Heropenen** (alleen voor losse logies of als override).
- Visuele hint als realisatie automatisch komt via gekoppeld programma.

## Out of scope
- Geen wijzigingen aan partner-zijde of customer portal.
- Geen wijziging aan bestaande RLS-policies (alleen lezen via admin blijft hetzelfde).
- Geen e-mailtemplates aanpassen in deze ronde (valt onder de eerder afgeronde mailfases).
