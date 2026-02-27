

## Plan: Aantal personen wijzigen met automatische heroffertering

### Wat wordt opgelost
Na acceptatie van een logiesofferte kan het aantal personen momenteel niet meer worden gewijzigd met heroffertering. Dit plan voegt toe:
- Admin kan aantal gasten aanpassen op de logies-detailpagina
- Klant kan aantal personen aanpassen (bestaande dialog), waarna de logiesofferte automatisch wordt gereset
- Partner krijgt een nieuwe aanvraag en klant kan opnieuw akkoord geven

### Wijzigingen

**1. Backend: `update-customer-program` edge function uitbreiden**
Momenteel wordt bij `numberOfPeople`-wijziging wel het programma bijgewerkt en de accommodatie-gasten gesynchroniseerd, maar worden geaccepteerde/geselecteerde quotes NIET gereset. Fix:
- Bij `numberOfPeople`-wijziging: ook `accommodation_requests.number_of_guests` bijwerken
- Alle quotes met status `selected`, `submitted` of `pending` resetten naar `pending` (inclusief `selected_at: null`, `submitted_at: null`)
- Accommodation request status terugzetten naar `processing`
- E-mail naar betrokken logiespartners sturen met het gewijzigde aantal gasten
- E-mail-bevestiging naar klant inclusief melding dat logiespartners opnieuw offreren

**2. Admin UI: Bewerkknop op `AdminAccommodationDetail`**
- Voeg een "Bewerken" knop toe naast het gasten-blokje in de aanvraagdetails
- Opent een compacte dialog (`EditAccommodationGuestsDialog`) met:
  - Invoerveld voor nieuw aantal gasten
  - Waarschuwing dat alle offertes worden gereset en partners opnieuw worden gecontacteerd
- Bij opslaan:
  - Update `accommodation_requests.number_of_guests` direct
  - Update `program_requests.number_of_people` van het gekoppelde programma
  - Reset alle quotes naar `pending`
  - Zet accommodation request status op `processing`
  - Stuur e-mails naar logiespartners via dezelfde logica als de edge function

**3. Klantportaal: bestaande flow compleet maken**
- De `EditProgramDetailsDialog` bestaat al en stuurt `numberOfPeople` mee
- De edge function `update-customer-program` moet bovenstaande reset-logica ook uitvoeren bij people changes (punt 1)
- De `AccommodationSection` moet de "Gegevens wijzigen" knop ook tonen wanneer een offerte is geselecteerd (nu alleen bij status "In behandeling")

### Technische details

| Bestand | Wijziging |
|---|---|
| `supabase/functions/update-customer-program/index.ts` | Bij `numberOfPeople` change: sync `number_of_guests`, reset alle accommodation quotes naar pending, reset accommodation status naar processing, email partners en klant |
| `src/pages/admin/AdminAccommodationDetail.tsx` | Bewerkknop + dialog voor aantal gasten, met directe DB-update + quote reset + email-trigger |
| `src/components/customer-portal/AccommodationSection.tsx` | "Gegevens wijzigen" knop ook tonen bij geselecteerde offerte (state 2) |

### Flow na implementatie
1. Admin of klant wijzigt aantal personen
2. Alle bestaande quotes (incl. geselecteerde) worden gereset naar "pending"
3. Accommodation request status gaat terug naar "processing"
4. Partners ontvangen e-mail met nieuw aantal en verzoek tot heroffertering
5. Partners dienen nieuwe offerte in via Partner Portal
6. Klant ziet opnieuw de offertes en kan opnieuw akkoord geven
