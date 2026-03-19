

## Probleem: Onterechte herinnering na wijziging aantal gasten

### Oorzaak

Toen je het aantal gasten van 13 naar 9 wijzigde, werd de offerte van Het Vlielandhotel gereset naar `status: "pending"` (dit is by design — de partner moet opnieuw offreren). Het probleem zit in de **herinnerings-job** (`check-pending-items`):

- De job zoekt offertes met `status = "pending"` die **ouder zijn dan 5 dagen** op basis van `created_at`
- Maar `created_at` is nog steeds 17 februari (de originele aanmaakdatum), niet de datum van de reset
- Daarom wordt de offerte direct als "te lang onbeantwoord" gezien en gaat er een herinnering uit — terwijl de partner net pas opnieuw is gevraagd

### Twee fixes

**1. `supabase/functions/check-pending-items/index.ts` — Gebruik `updated_at` in plaats van `created_at`**

De reminder-query (regel 293) moet filteren op `updated_at` in plaats van `created_at`. Wanneer een offerte wordt gereset naar "pending", wordt `updated_at` geüpdatet. Zo krijgt de partner opnieuw 5 dagen de tijd.

```
// Was:
.lt("created_at", partnerQuoteCutoff.toISOString())

// Wordt:
.lt("updated_at", partnerQuoteCutoff.toISOString())
```

Ook de berekening van `daysSince` (regel 323-325) moet `updated_at` gebruiken:
```
// Was:
(Date.now() - new Date(quote.created_at).getTime())

// Wordt: 
(Date.now() - new Date(quote.updated_at).getTime())
```

Dit vereist dat `updated_at` ook wordt meegeselecteerd in de query (toevoegen aan de select op regel 276-293).

**2. Email deduplicatie verbeteren — `related_item_id` meegeven**

De `logExtra` bij de herinnerings-email (regel 367-370) bevat geen `related_item_id`, waardoor deduplicatie per quote niet werkt. Toevoegen:

```typescript
logExtra: {
  email_type: "reminder_quote_pending",
  related_partner_id: quote.partner_id,
  related_item_id: quote.id,  // Toevoegen
},
```

Dit voorkomt dat dezelfde partner meerdere herinneringen ontvangt voor dezelfde offerte.

### Impact
- Partners krijgen na een gastenaantal-wijziging opnieuw 5 dagen de tijd voordat een herinnering wordt verstuurd
- Bestaande (foutief verstuurde) herinneringen worden niet teruggedraaid
- Geen UI-wijzigingen nodig

