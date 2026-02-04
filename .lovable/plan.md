

# Plan: Afwijzen van Logies Aanvragen door Partner

## Samenvatting

Momenteel kunnen logiespartners alleen een offerte indienen voor een logiesaanvraag. Er ontbreekt de mogelijkheid om een aanvraag **af te wijzen** (bijvoorbeeld wanneer er geen beschikbaarheid is). Dit plan voegt deze functionaliteit toe, consistent met hoe activiteitenpartners kunnen reageren.

## Oplossing

De `PartnerAccommodationQuoteSheet` wordt uitgebreid met een **"Niet beschikbaar" optie**, vergelijkbaar met de `PartnerItemSheet` voor activiteiten. Wanneer een logiespartner kiest voor afwijzen, wordt de quote status op "declined" gezet en wordt optioneel een reden opgeslagen.

## Wijzigingen

### 1. Database: Nieuwe status toevoegen

De `accommodation_quotes.status` kolom ondersteunt al vrije tekst. We voegen "declined" toe als geldige status.

- **Status "declined"** wordt gebruikt wanneer een partner aangeeft niet beschikbaar te zijn
- Het `partner_notes` veld wordt gebruikt om een optionele reden op te slaan

### 2. Frontend: PartnerAccommodationQuoteSheet.tsx

Aanpassingen aan het quote formulier:

```text
┌─────────────────────────────────────────────────┐
│  Aanvraag details (bestaand)                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ○ Offerte indienen                             │
│    Vul onderstaand formulier in                 │
│                                                 │
│  ○ Niet beschikbaar                             │
│    Deze aanvraag afwijzen                       │
│                                                 │
├─────────────────────────────────────────────────┤
│  [Als "Offerte indienen" geselecteerd]          │
│  - Bestaande offerte velden                     │
│                                                 │
│  [Als "Niet beschikbaar" geselecteerd]          │
│  - Reden voor afwijzing (optioneel) textarea    │
│                                                 │
├─────────────────────────────────────────────────┤
│  [Annuleren]        [Versturen]                 │
└─────────────────────────────────────────────────┘
```

Technische wijzigingen:
- `RadioGroup` toevoegen met opties: "submit_quote" en "decline"
- Conditioneel tonen: offerte formulier OF afwijzingsformulier
- Bij "decline": `status` updaten naar "declined" + `partner_notes` voor reden
- Submitted_at timestamp bijwerken bij afwijzing

### 3. Frontend: PartnerAccommodationRequestCard.tsx

- Nieuwe status "declined" toevoegen aan `QUOTE_STATUS_CONFIG`
- Label: "Afgewezen" met `destructive` variant
- Kaart tonen in "Afgerond" tab (niet in "Te beantwoorden")

### 4. Frontend: PartnerAccommodation.tsx

- `handleQuoteDecline` functie toevoegen
- Of bestaande `handleQuoteSubmit` uitbreiden met decline logica
- Afgewezen aanvragen in de "Afgerond" tab tonen

### 5. Types: accommodation.ts

- Status "declined" toevoegen aan `AccommodationQuoteStatus` type

## Technische Details

### Database Update Query (bij afwijzing)
```typescript
await supabase
  .from("accommodation_quotes")
  .update({
    status: "declined",
    partner_notes: declineReason || null,
    submitted_at: new Date().toISOString(), // Markeer als verwerkt
  })
  .eq("id", quoteId);
```

### UI Componenten te wijzigen:
1. **PartnerAccommodationQuoteSheet.tsx** - Hoofdwijziging: RadioGroup met keuze + conditionele formulieren
2. **PartnerAccommodationRequestCard.tsx** - Status badge + actieknoppen
3. **PartnerAccommodation.tsx** - Filter logica voor tabs

### Status Badge Configuratie
```typescript
declined: { 
  label: "Afgewezen", 
  variant: "destructive" 
}
```

### Tab Filtering
```typescript
// "Afgerond" tab toont nu ook declined:
const closedRequests = requests.filter(r => 
  r.quote?.status === "selected" || 
  r.quote?.status === "rejected" || 
  r.quote?.status === "declined" ||  // NIEUW
  r.quote?.status === "expired"
);
```

## Gebruikerservaring

1. Logiespartner opent een aanvraag in "Te beantwoorden"
2. Sheet toont twee opties bovenaan: "Offerte indienen" of "Niet beschikbaar"
3. Bij "Niet beschikbaar":
   - Optioneel veld voor reden (bijv. "Volgeboekt in deze periode")
   - Klik op "Afwijzen" knop
4. Aanvraag verdwijnt uit "Te beantwoorden" en verschijnt in "Afgerond" met status "Afgewezen"
5. Partner kan later nog de details bekijken maar niet meer reageren

