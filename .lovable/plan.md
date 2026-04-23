

# Plan: Projecten en logies-aanvragen kunnen afhandelen

## Doel
Beheerders kunnen projecten en (ook losse) logies-aanvragen markeren als **Afgerond** zodra alles geleverd én volledig gefactureerd is. Dit gebeurt automatisch wanneer er niets meer openstaat, en kan handmatig via een knop. Een afgeronde aanvraag verdwijnt uit de werkvoorraad maar kan met reden worden heropend voor correcties.

## Wat de gebruiker krijgt

### 1. Facturatie-overzicht (`/admin/facturatie`)
- Nieuwe knop **"Markeer als afgerond"** op elke kaart waar `outstanding ≤ 0` en nog niet `fully_invoiced`.
- Nieuwe sectie/tab **"Losse logies-aanvragen"** met dezelfde drie buckets (Klaar / Gedeeltelijk / Afgerond) voor logies zonder gekoppeld programma.
- In de tab **"Volledig gefactureerd"** een **"Heropen"**-knop per kaart.

### 2. Project-detailpagina (`/admin/aanvragen/:id`)
- In de `NextStepBanner` / kop-acties een knop **"Markeer project als afgerond"** zodra alles gefactureerd is.
- Bij een afgerond project een rustige badge **"Afgerond op DD-MM-YYYY"** met **"Heropen"**-knop (vraagt om reden).

### 3. Logies-detailpagina (`/admin/logies-aanvragen/:id`)
- Naast "Aanvraag sluiten" een knop **"Markeer als afgerond"** (alleen actief als selected quote volledig gefactureerd is, of altijd handmatig met bevestiging).
- Badge "Afgerond" + "Heropen"-knop met reden.

### 4. Automatische afronding
- Bij het registreren van een (deel)factuur via `RegisterBureauInvoiceDialog` of partner-factuur op een geselecteerde logies-quote: server-side check — als nieuwe `outstanding ≤ 0` → `completion_status = 'fully_invoiced'` en `completed_at = now()`.

### 5. Doorwerking in bestaande overzichten
- `AdminProjects`, `WorkOverview`, `ProjectCalendarView`, `ProjectDateListView`, `ProjectGanttChart` tonen automatisch "Afgerond" omdat ze al op `completion_status === 'fully_invoiced'` filteren.
- `check-pending-items` edge function blijft afgeronde projecten overslaan (`.neq("completion_status", "completed")` werkt al).
- Lifecycle-helper `getProjectPhase` herkent `fully_invoiced` al als `afgerond` — geen wijziging nodig.

## Technische uitwerking

### Database-migratie
1. **`accommodation_requests`**:
   - Nieuwe kolom `completion_status text` (nullable, default null), met validatie-trigger op waarden `null | 'in_progress' | 'partially_invoiced' | 'ready_for_invoice' | 'fully_invoiced'`.
   - Nieuwe kolom `completed_at timestamptz`, `completed_by uuid`, `reopened_reason text`.
2. **`program_requests`**: kolommen bestaan al (`completion_status`), nieuwe kolommen `completed_at`, `completed_by`, `reopened_reason` toevoegen.
3. **History**: `program_request_history` wordt al gebruikt; voor logies komen er rijen in `project_communications` (bestaande tabel — gebruikt op AdminAccommodationDetail) met action `completion_marked` / `completion_reopened`.
4. RLS op nieuwe kolommen erft mee van bestaande table-policies (admin full access).

### Edge functions
Nieuw: **`set-project-completion`** (admin-only, JWT-validatie, Zod):
- Input: `{ entity_type: 'program' | 'accommodation', entity_id, action: 'complete' | 'reopen', reason? }`.
- Acties:
  - `complete`: zet `completion_status='fully_invoiced'`, `completed_at=now()`, schrijft history-rij, sluit gerelateerde openstaande `admin_todos` (auto_type in invoicing-set).
  - `reopen`: zet `completion_status='partially_invoiced'` (of `ready_for_invoice` als er nog niets gefactureerd is), `completed_at=null`, slaat `reopened_reason` op + history-rij.
- Voor `accommodation` ook: indien gekoppeld project bestaat en óók afgerond is, wordt het project niet automatisch heropend — admin krijgt waarschuwing in UI.

Aangepast: bestaande edge functions die facturen registreren — na succesvolle insert een helper aanroepen `maybeAutoComplete(entity)` die outstanding herberekent en bij ≤ 0 automatisch `completion_status='fully_invoiced'` zet.

### Frontend-bestanden
- `src/pages/admin/AdminInvoicing.tsx`: knoppen + nieuwe tab voor losse logies + query uitbreiden met `accommodation_requests` zonder `linked_program_id`.
- `src/pages/admin/AdminAccommodationDetail.tsx`: completion-knoppen + badge.
- `src/pages/admin/AdminProjectDetail.tsx`: completion-knoppen + badge in banner.
- `src/components/admin/NextStepBanner.tsx`: nieuwe phase "klaar voor afronding" als outstanding 0 maar nog niet `fully_invoiced`.
- `src/lib/lifecycle.ts`: kleine uitbreiding voor de "klaar voor afronding"-tussenfase.
- Nieuw klein component `CompletionActions.tsx` (gedeelde knoppen + reopen-dialog).

### UI-flow heropenen
Reopen-knop opent `AlertDialog` met verplicht tekstveld "Reden van heropening". Reden komt in historie + admin_activity_log (`action: 'project_reopened'`).

## Niet in scope
- Aanpassingen aan klantportaal of partnerportaal (afronden is puur admin-actie; klant ziet alleen via standaard "Afgerond"-status).
- Wijzigen van bestaande facturen of credit-flow — dat blijft via creditfactuur registreren.
- Automatisch e-mailen van klant bij afronding (kan later toegevoegd worden als gewenst).

