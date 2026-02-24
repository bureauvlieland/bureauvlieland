

# Partner notificatie bij verlopen logiesofferte

## Probleem
Wanneer de `valid_until` datum van een logiesofferte verstreken is, krijgt de partner daar geen melding van. Hierdoor weten ze niet dat hun offerte niet meer geldig is en kunnen ze de geldigheid niet verlengen of het aanbod aanpassen.

## Oplossing
Twee mechanismen toevoegen:

### 1. Dagelijkse controle in `check-pending-items` -- nieuwe CHECK 5
De bestaande cron-job krijgt een extra controle die:
- Alle `accommodation_quotes` ophaalt met status `submitted` waar `valid_until < vandaag`
- Per verlopen offerte:
  - De status bijwerkt naar `expired`
  - Een e-mail stuurt naar de partner met de melding dat hun offerte verlopen is
  - Een admin-todo aanmaakt van type `quote_expired_partner`

De e-mail bevat:
- Naam van de accommodatie en de klant
- De oorspronkelijke geldigheidsperiode
- Link naar het partnerportaal om de offerte te verlengen

### 2. Auto-todo type toevoegen
- Nieuw type `quote_expired_partner` in `autoTodoCreator.ts` met label "Offerte verlopen" en rode styling

### 3. Partner kan geldigheid verlengen
In het partnerportaal (`PartnerAccommodationQuoteSheet.tsx`) moet een partner bij een verlopen offerte de `valid_until` datum kunnen aanpassen. Wanneer ze een nieuwe datum kiezen:
- Status gaat terug van `expired` naar `submitted`
- `valid_until` wordt bijgewerkt
- Bureau Vlieland krijgt een admin-todo dat de offerte verlengd is

## Technisch overzicht

| Bestand | Wijziging |
|---|---|
| `supabase/functions/check-pending-items/index.ts` | CHECK 5: verlopen quotes detecteren, status updaten, e-mail sturen, todo aanmaken |
| `supabase/functions/_shared/email-templates.ts` | Nieuw template `quote_expired_partner` |
| `src/lib/autoTodoCreator.ts` | Nieuw type `quote_expired_partner` toevoegen |
| `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx` | Datum-verlenging UI bij verlopen offerte |

### CHECK 5 logica (pseudo-code)

```text
1. Haal alle accommodation_quotes op waar:
   - status = 'submitted'
   - valid_until < vandaag
   - request niet geannuleerd en niet verlopen
2. Per quote:
   a. Update status naar 'expired'
   b. Haal partner e-mail op
   c. Stuur e-mail: "Uw offerte voor [klant] is verlopen"
   d. Maak admin_todo aan (type: quote_expired_partner)
```

### E-mail inhoud (Nederlands)
- Onderwerp: "Uw logiesofferte voor [klantnaam] is verlopen"
- Body: "Uw offerte '[accommodatie_naam]' voor [klantnaam] was geldig tot [datum] en is inmiddels verlopen. U kunt de geldigheid verlengen via uw partnerportaal."
- CTA-knop: "Offerte bekijken"

### Partner verlenging
In de quote sheet voor partners wordt bij status `expired` een gele banner getoond:
- Tekst: "Deze offerte is verlopen. Pas de geldigheid aan om de offerte opnieuw beschikbaar te maken."
- Datumveld om nieuwe `valid_until` te kiezen
- Bij opslaan: status terug naar `submitted`, melding naar admin

## Database
- De `accommodation_quotes` status check constraint moet `expired` al bevatten (dit is al het geval)
- Geen schema-wijzigingen nodig

## Wat niet verandert
- Klantportaal (toont al "Verlopen" badge)
- Admin accommodatie-overzicht (werkt al met expired status)
- Andere e-mailflows
