

## Probleem

De `item_quote_status` "bevestigd" heeft als omschrijving "Door partner bevestigd", maar wordt al gezet **voordat** items naar de partner zijn gestuurd. Dit gebeurt op twee plekken:

1. **`send-quote-offer`** (offerte naar klant) — zet alle items naar "bevestigd"
2. **`accept-quote-proposal`** (akkoord verwerken) — zet concept/in_afstemming items naar "bevestigd" (de fix van zojuist)

Als de admin vervolgens items naar de partner stuurt, staat de status al op "Bevestigd" terwijl de partner nog niks heeft bevestigd.

## Oplossing

De `item_quote_status` moet de juiste stap in het offerteproces reflecteren:

- **concept** → item is nog in opbouw
- **in_afstemming** → item is opgenomen in de offerte / verstuurd naar partner, wacht op bevestiging
- **bevestigd** → partner heeft daadwerkelijk bevestigd

### Wijzigingen

**1. `supabase/functions/send-quote-offer/index.ts` (regel ~285)**
Wijzig: `item_quote_status: "bevestigd"` → `item_quote_status: "in_afstemming"`

Wanneer de offerte naar de klant wordt verstuurd, zijn de items "in afstemming" — niet bevestigd door de partner.

**2. `supabase/functions/accept-quote-proposal/index.ts` (de recente fix)**
Wijzig: `item_quote_status: "bevestigd"` → `item_quote_status: "in_afstemming"`

Zelfde logica: bij akkoord worden items naar partners gestuurd, dus ze gaan naar "in afstemming".

**3. `src/types/programRequest.ts` (regel 97)**
Pas de beschrijving van "in_afstemming" aan zodat deze duidelijker is:
- `description: "In afstemming met partner"` → `description: "Opgenomen in offerte, wacht op partnerbevestiging"`

Of korter: laat staan, de huidige tekst is al duidelijk genoeg.

### Wanneer wordt "bevestigd" dan gezet?

"Bevestigd" moet alleen gezet worden wanneer de partner daadwerkelijk reageert met een bevestiging. Dit gebeurt al correct via de partner-response flow (wanneer een partner "Bevestigen" kiest in het partnerportaal).

### Impact
- Nieuwe offertes/akkoorden krijgen de juiste status "in_afstemming"
- Bestaande items met foutief "bevestigd" moeten handmatig worden gecorrigeerd
- De klant-facing labels blijven correct: "in_afstemming" toont als "Onder voorbehoud" voor de klant

