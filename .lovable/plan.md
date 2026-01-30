
# Plan: Logiesbewerking Validatie en Data-integriteit

## Problemen Geïdentificeerd

### 1. Dubbele Logies-koppelingen in Database
De database analyse toont:
- BV-2601-0006 EN BV-2601-0007 verwijzen beide naar LOG-2601-0003
- BV-2601-0004 EN BV-2601-0005 verwijzen naar dezelfde logiesaanvraag
- Beiden zijn op exact hetzelfde moment aangemaakt (trigger heeft dubbel gevuurd)

**Oorzaak**: Er is geen UNIQUE constraint op `program_requests.linked_accommodation_id`, waardoor meerdere programma's naar dezelfde logiesaanvraag kunnen verwijzen.

### 2. Datum Synchronisatie Status
De edge function `update-customer-program` is correct geïmplementeerd:
- Update `accommodation_requests.arrival_date` en `departure_date`
- Notificeert logiespartners via email
- Reset offerte statussen naar "pending"

Maar de **AccommodationSection** toont de datums uit de `accommodation` prop, niet uit de opnieuw opgehaalde data na een update.

### 3. Ontbrekende Referentienummer Weergave
De referentienummer badge voor logies is toegevoegd aan `ProgramOverviewCard`, maar moet correct worden weergegeven.

---

## Deel 1: Database Integriteit Herstellen

### A. Unique Constraint Toevoegen
Voeg een unique constraint toe op `linked_accommodation_id`:

```sql
-- Eerst duplicaten verwijderen (behoud alleen het programma dat de accommodatie als linked_program_id heeft)
-- Dan constraint toevoegen

-- Optie 1: Verwijder duplicaat koppelingen (niet de programma's zelf)
UPDATE program_requests pr
SET linked_accommodation_id = NULL
WHERE linked_accommodation_id IS NOT NULL
  AND id NOT IN (
    SELECT ar.linked_program_id 
    FROM accommodation_requests ar 
    WHERE ar.linked_program_id IS NOT NULL
  );

-- Voeg unique constraint toe
ALTER TABLE program_requests
ADD CONSTRAINT program_requests_linked_accommodation_id_unique 
UNIQUE (linked_accommodation_id);
```

### B. Bestaande Duplicaten Opschonen
Huidige foutieve koppelingen corrigeren:
- BV-2601-0006 moet `linked_accommodation_id = NULL` krijgen (LOG-2601-0003 hoort bij BV-2601-0007)
- BV-2601-0004 moet `linked_accommodation_id = NULL` krijgen

---

## Deel 2: Frontend Data Refresh na Wijziging

### A. AccommodationSection Datums
Het probleem is dat de `accommodation` object in de UI niet opnieuw wordt opgehaald na een datumwijziging. 

**Huidige flow:**
1. Klant klikt "Gegevens wijzigen" → EditProgramDetailsDialog
2. Dialog submit → `updateProgramDetails()` → edge function
3. Edge function update `program_requests.selected_dates` EN `accommodation_requests.arrival_date/departure_date`
4. `useCustomerProgram` roept `fetchProgram()` aan → dit haalt de accommodatie opnieuw op

**Te controleren:**
- Werkt de `refetch()` call correct na `updateProgramDetails()`?

**Bestand: `src/hooks/useCustomerProgram.ts`**
De `updateProgramDetails` functie roept al `fetchProgram()` aan bij succes. Dit zou de nieuwe accommodatie datums moeten ophalen.

Echter, ik zie dat de `accommodation.arrival_date` en `accommodation.departure_date` los van de `selected_dates` worden weergegeven in de `AccommodationSection`. Als de fetch goed werkt, moet dit ook updaten.

**Mogelijke oorzaak:** React Query cache of de state wordt niet correct gerefresht.

---

## Deel 3: Admin Interface Validatie

### A. AdminProjects.tsx Duplicaat Weergave
De huidige code toont elk programma als aparte regel. Bij dubbele `linked_accommodation_id` verschijnt dezelfde logies bij meerdere programma's.

Na het toevoegen van de unique constraint zal dit probleem verdwijnen.

### B. Toevoeging: Duplicaat Detectie
Optioneel: Voeg een warning toe als er duplicaat-koppelingen worden gedetecteerd.

---

## Deel 4: Partner Portal Validatie

De `update-customer-program` edge function stuurt emails naar partners bij datumwijziging:
- Activiteitenpartners ontvangen "Datumwijziging aanvraag"
- Logiespartners ontvangen "Datumwijziging logiesaanvraag"

Dit is correct geïmplementeerd.

---

## Implementatie Stappen

| # | Actie | Bestand/Tool |
|---|-------|--------------|
| 1 | Corrigeer duplicaat koppelingen in database | SQL migratie |
| 2 | Voeg unique constraint toe | SQL migratie |
| 3 | Verifieer data refresh na updateProgramDetails | `useCustomerProgram.ts` - debug log toevoegen |
| 4 | Deploy en test edge function | `update-customer-program` |

---

## Migratie SQL

```sql
-- Stap 1: Corrigeer foutieve linked_accommodation_id koppelingen
-- Behoud alleen de programma's die daadwerkelijk als linked_program_id in accommodation_requests staan
UPDATE public.program_requests pr
SET linked_accommodation_id = NULL,
    updated_at = now()
WHERE linked_accommodation_id IS NOT NULL
  AND id NOT IN (
    SELECT ar.linked_program_id 
    FROM public.accommodation_requests ar 
    WHERE ar.linked_program_id IS NOT NULL
  );

-- Stap 2: Voeg unique constraint toe om toekomstige duplicaten te voorkomen
ALTER TABLE public.program_requests
ADD CONSTRAINT program_requests_linked_accommodation_id_unique 
UNIQUE (linked_accommodation_id);
```

---

## Verwacht Resultaat

Na implementatie:
1. **Klantpagina**: Referentienummers voor zowel programma als logies zichtbaar
2. **Klantpagina**: Datumwijzigingen worden correct gesynchroniseerd naar logiesaanvraag
3. **Admin**: Geen dubbele verwijzingen meer naar dezelfde logiesaanvraag
4. **Partner Portal**: Partners ontvangen notificatie bij datumwijziging

---

## Test Scenario's

### Klantportaal
1. Open een programma met gekoppelde logiesaanvraag
2. Controleer of beide referentienummers zichtbaar zijn
3. Klik "Gegevens wijzigen" bij logies of programma
4. Wijzig de datums
5. Controleer of de nieuwe datums worden getoond in AccommodationSection
6. Controleer of logiespartners een email ontvangen

### Admin
1. Open Projecten overzicht
2. Controleer dat elke logiesaanvraag maar bij één programma verschijnt

### Partner Portal
1. Log in als logiespartner
2. Controleer of datumwijziging notificatie is ontvangen
3. Controleer of offerte status is gereset naar "pending"
