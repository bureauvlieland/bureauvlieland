

# Data Fix + Keuze-dialoog bij annulering

## Deel 1: Data fix - LOG-2602-0001 op cancelled zetten

De logiesaanvraag van Jack Frieling (LOG-2602-0001, id `f6b3e236-eff4-43d4-b360-aebab4d47c6e`) staat nog op `processing` met 2 openstaande offertes (Seeduyn: `submitted`, Badhotel Bruin: `submitted`). Deze moeten nu handmatig worden bijgewerkt:

- **accommodation_requests**: status -> `cancelled`
- **accommodation_quotes**: beide `submitted` offertes -> `rejected`

Dit wordt uitgevoerd via een database insert-tool (UPDATE statements).

---

## Deel 2: Keuze-dialoog "Wil je ook de logies annuleren?"

### Wat verandert er?

Wanneer een klant (of later een admin) een programma annuleert en er een gekoppelde logiesaanvraag bestaat, verschijnt er een extra keuze in het annuleringsscherm:

> "Er is ook een logiesaanvraag gekoppeld aan dit programma. Wil je deze ook annuleren?"
> - Ja, annuleer ook de logies
> - Nee, alleen het programma annuleren

### Bestanden die worden aangepast

#### 1. `src/components/customer-portal/CancelRequestDialog.tsx`
- Nieuwe prop `hasLinkedAccommodation: boolean` toevoegen
- Als `true`: toon een checkbox of radio-groep met de keuze "Ook logiesaanvraag annuleren"
- De keuze wordt meegegeven aan `onConfirm` als extra parameter (`cancelAccommodation: boolean`)

#### 2. `src/hooks/useCustomerProgram.ts`
- De `cancelRequest` functie krijgt een extra parameter: `cancelAccommodation: boolean`
- Deze wordt doorgegeven aan de edge function

#### 3. `supabase/functions/cancel-program-request/index.ts`
- Nieuw veld in de request body: `cancelAccommodation: boolean` (default: `true` voor backwards compatibility)
- Als `cancelAccommodation` is `false`: sla de hele accommodatie-annuleringslogica over (zowel de directe link, reverse link, als fallback)
- Als `true` (of niet meegegeven): bestaande gedrag behouden

#### 4. `src/pages/CustomerProgram.tsx`
- De `hasLinkedAccommodation` prop doorgeven aan `CancelRequestDialog`, gebaseerd op de bestaande `accommodation` state
- De `handleCancelRequest` handler updaten om de `cancelAccommodation` boolean door te geven

### UX-ontwerp

In het bestaande annuleringsvenster, na het overzichtsblok (activiteiten/aanbieders/datum), wordt een extra sectie getoond wanneer er een logiesaanvraag is:

```text
+-----------------------------------------------+
| [Hotel-icoon] Gekoppelde logiesaanvraag        |
|                                                |
| Er is een logiesaanvraag gekoppeld aan dit     |
| programma.                                     |
|                                                |
| [x] Ook de logiesaanvraag annuleren            |
|     Logiespartners worden op de hoogte gesteld  |
|                                                |
| [ ] Alleen het programma annuleren             |
|     De logiesaanvraag blijft actief            |
+-----------------------------------------------+
```

De checkbox staat standaard **aan** (logies ook annuleren), zodat het veiligste pad de default is.
