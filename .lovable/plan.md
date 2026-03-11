

# Admin: Verlopen offerte heractiveren

## Wat
Een "Heractiveren" knop toevoegen op verlopen offertekaarten in de admin logies-detailpagina. De admin kiest een nieuwe geldigheidsdatum, waarna de offerte-status teruggaat naar `submitted` en de klant hem weer kan bekijken/accepteren.

## Aanpak

### 1. `AdminAccommodationDetail.tsx` — Heractiveer-knop + dialog
- Bij `quote.status === "expired"` een "Heractiveren" knop tonen in de actions-sectie (regel ~640-685)
- Klik opent een kleine dialog met een datepicker voor de nieuwe `valid_until`
- Bij bevestiging: `UPDATE accommodation_quotes SET status = 'submitted', valid_until = :newDate WHERE id = :quoteId`
- Na success: refetch + toast + communicatie-log entry in `project_communications`

### 2. Communicatie-log
- Bij heractivering een `project_communications` entry aanmaken (type: `note`, direction: `internal`) met vermelding van de nieuwe geldigheidsdatum

### Bestanden
- `src/pages/admin/AdminAccommodationDetail.tsx` — heractiveer-knop, dialog state, mutation

Geen database-migratie nodig — het is een simpele status- en datumwijziging op een bestaande tabel.

