

## Plan: Akkoord-knop alleen tonen bij bevestigde items

### Probleem
In de quote-modus toont het portaal de "Akkoord"-knop bij items met `item_quote_status` "in_afstemming" óf "bevestigd". Maar een item met status "Aangevraagd" (partner nog niet bevestigd) toont dan dezelfde groene "Akkoord"-knop als een item met status "Bevestigd". De klant weet niet waar ze akkoord op geven — er is nog niks concreets bevestigd door de partner.

### Oplossing

**Optie: "Akkoord" pas tonen wanneer het item operationeel bevestigd is**

In `src/lib/customerQuoteApproval.ts` — de functie `isQuoteItemAwaitingCustomerApproval`:

- Voeg een extra check toe: het item moet operationeel status `confirmed` (of `alternative`) hebben, niet alleen een `item_quote_status` van "in_afstemming"/"bevestigd"
- Items die nog "aangevraagd" zijn bij de partner krijgen dan geen "Akkoord"-knop meer

```typescript
// Huidige logica:
return customerQuoteApprovalStatuses.includes(item.item_quote_status);

// Nieuwe logica:
const operationallyReady = item.status === "confirmed" || item.status === "alternative";
return operationallyReady && customerQuoteApprovalStatuses.includes(item.item_quote_status);
```

Dit zorgt ervoor dat de klant alleen "Akkoord" kan geven op items die daadwerkelijk bevestigd zijn door de partner, wat de verwarring wegneemt.

### Eén bestand
- `src/lib/customerQuoteApproval.ts` — extra statuscheck toevoegen

