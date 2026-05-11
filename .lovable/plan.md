## Doel
Geannuleerde en verwijderde projecten vervuilen de Werkbank niet meer, maar blijven vindbaar via een toggle.

## Probleem (gevonden in DB & code)
- `listProjectsForWerkbank` filtert wel `status='cancelled'` weg, maar **niet** `status='deleted'` (11 projecten lekken zo door).
- Logies-aanvragen met `status='cancelled'` op een nog actief programma kunnen ook ruis geven in het detailpanel.
- De Inbox toont todo's die hangen aan geannuleerde/verwijderde projecten als "losse taak" (project=null), waardoor het lijkt alsof het project er nog staat.

## Aanpak

### 1. Lijst Werkbank → Projecten
- `listProjectsForWerkbank()` standaard óók `status='deleted'` uitsluiten (naast `cancelled` en `cancelled_at IS NULL`).
- Nieuwe parameter `archiveOnly?: boolean`. Bij `true` juist alleen projecten met `status IN ('cancelled','deleted')` of `cancelled_at IS NOT NULL` ophalen.
- Afgerond / `fully_invoiced` blijft gewoon zichtbaar in de hoofdlijst (conform jouw keuze).

### 2. Toggle in de Werkbank-header
- Nieuwe pill bovenin de Projecten-tab: **"Toon archief"** (icoon Archive). Aan/uit-state lokaal in component, plus `?archief=1` in de URL zodat refresh blijft werken.
- Toggle wisselt query-key (`werkbank-projects` ↔ `werkbank-projects-archief`) zodat React Query niets verwart.
- Quick-views (Wacht op mij / klant / partner / stilte) worden in archiefmodus verborgen — daar zijn ze niet relevant.
- Lege staat: "Geen gearchiveerde projecten."

### 3. Inbox opschonen
- In `loadInbox()` todo's wegfilteren waarvan `related_request_id` verwijst naar een project dat **niet** in de actieve projectenlijst zit (dus geannuleerd of verwijderd). Echte losse taken (geen `related_request_id`) blijven zichtbaar.
- Indirect bonus: Inbox toont geen "spookrijen" meer voor weggegooide projecten.

### 4. Detail-panel
- Geen wijziging nodig; via direct URL (`?id=...&archief=1`) blijft een gearchiveerd dossier openbaar.
- Wel: kleine badge "Gearchiveerd" boven de titel als `status IN ('cancelled','deleted')`, zodat duidelijk is dat je in het archief kijkt.

### 5. Validatie
- DB-query vóór: 14 actief / 10 cancelled / 11 deleted → na fix verwacht: 17 in hoofdlijst (14 active + 3 fully/partially invoiced afgerond), 21 in archief.
- Visuele check: toggle aan → archieflijst, toggle uit → schone werklijst, Inbox bevat geen rijen meer voor cancelled/deleted projecten.
- Detail-panel openen vanuit archief blijft werken.

## Buiten scope
- Geen DB-migratie nodig (puur read-side filter).
- Geen wijziging aan delete/cancel-flows zelf.
- Geen aparte route — toggle is voldoende.
