

## Plan: Banner-melding corrigeren op splash-pagina

### Probleem
De amber banner op de splash-pagina toont altijd "Bureau Vlieland is uw programma aan het samenstellen" voor maatwerk-projecten, ook wanneer er al items in het programma staan. De check op regel 258 gebruikt `isMaatwerk` terwijl het `isMaatwerkEmpty` zou moeten zijn.

### Aanpassing

**`src/components/customer-portal/CustomerPortalSplash.tsx`** — regel 253-264:

De banner-logica wordt aangescherpt met drie scenario's:

1. **Offerte wacht op akkoord** (`isQuoteAwaitingApproval`): "Uw offerte staat klaar" — blijft ongewijzigd
2. **Maatwerk zonder items** (`isMaatwerkEmpty`): "Bureau Vlieland is uw programma aan het samenstellen" — dit is de correcte situatie voor deze melding
3. **Maatwerk mét items / standaard quote**: Contextafhankelijke melding over de huidige fase (bijv. "Dit is een werkdocument" of een melding over de afstemming)

Concreet: wijzig `isMaatwerk` naar `isMaatwerkEmpty` op regel 258.

Daarnaast: als het programma al gepubliceerd is en de status voorbij "concept" is, kan de amber banner mogelijk helemaal weg of een passendere tekst tonen. Ik check of `quote_status` al verder is (bijv. "offerte_verstuurd") — dat wordt al afgevangen door `isQuoteAwaitingApproval`. Voor tussenstatussen zoals "in_afstemming" past de werkdocument-tekst.

### Eén bestand
- `src/components/customer-portal/CustomerPortalSplash.tsx` — `isMaatwerk` → `isMaatwerkEmpty` in de banner-conditie

