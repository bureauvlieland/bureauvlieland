## Wat er misging

Project **BV-2607-0001** (Jos Aanstoot, Fitt in Business / Sketz) is aangemaakt vanuit de sales inbox met `selected_dates = ["22 oktober tot en met 25 oktober 2026"]` — één vrije tekstregel in plaats van losse ISO-datums. De rest van de app (o.a. `getProject`, agenda, todo-scheduling, `claudia-daily-scan`) verwacht `YYYY-MM-DD` strings en klapt om op deze rij, waardoor het project niet opent.

Oorzaak: de AI-scan geeft `preferred_dates` als natuurlijke taal terug ("22 oktober tot en met 25 oktober 2026"). In `AdminSalesInbox.tsx` wordt dat direct in een tekstveld gezet (`preferred_dates.join(", ")`), en `create-request-from-sales-inbox` slaat het onveranderd op. Er is geen parsing/normalisatie.

## Fix

### 1. Bestaande rij herstellen
Update `program_requests` waar id = `b468905a-b3f2-415e-95fd-cd77cf8e04d2`:

```
selected_dates = ["2026-10-22","2026-10-23","2026-10-24","2026-10-25"]
```

(22 t/m 25 okt = 4 dagen, matcht ook de wensen-tekst: dag 1 boot 22 okt, dag 2 zeehondentocht, wisselende overnachtingen 1/2/3 nachten → laatste vertrek 25 okt.)

Daarna is het project weer normaal te openen en verschijnt de juiste datum in plaats van "geen datum".

### 2. Voorkomen dat dit weer gebeurt

**Server (`supabase/functions/create-request-from-sales-inbox/index.ts`):**
- Voeg een `normalizeDates()` helper toe die per input-string probeert te parsen:
  - ISO `YYYY-MM-DD` → behoud
  - `DD-MM-YYYY` / `DD/MM/YYYY` → naar ISO
  - Nederlandse maandnamen: `"22 oktober 2026"` → `2026-10-22`
  - Bereiken: `"X tot en met Y"`, `"X t/m Y"`, `"X – Y"`, `"X - Y"` → array van alle datums tussen X en Y (inclusief), waarbij Y de maand/jaar van X kan overnemen als die ontbreekt (`"22 t/m 25 oktober 2026"`)
- Alles wat niet te parsen is → afkeuren met duidelijke 400-fout (`"Kan datum niet interpreteren: '<tekst>'"`) zodat we nooit meer een onbruikbare rij krijgen. Datums worden gededupliceerd en gesorteerd voor opslag.

**UI (`src/pages/admin/AdminSalesInbox.tsx`):**
- Zelfde parser client-side (gedeelde util in `src/lib/`), zodat de dialog live onder het datumveld een preview toont: *"→ 22, 23, 24, 25 oktober 2026 (4 dagen)"* of een rode waarschuwing als het niet lukt.
- Submit-knop disabled zolang de tekst niet parseert.
- Placeholder aanpassen naar: `"22 t/m 25 oktober 2026 of 15 mei 2026, 16 mei 2026"`.

### Buiten scope
Ik raak alleen de datumverwerking van sales-inbox → project aan. Geen wijzigingen aan de AI-scan-prompt zelf, aan andere `selected_dates`-consumenten, of aan bestaande projecten anders dan BV-2607-0001. Andere historische sales-inbox rijen worden niet retroactief gescand; als er meer projecten met kapotte datums zijn hoor ik dat graag en dan patch ik die apart.
