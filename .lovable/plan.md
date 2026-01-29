# Uniforme Voorwaarden Horeca - Conditioneel tonen

## ✅ Status: Voltooid

De UVH voorwaarden worden nu conditioneel getoond: alleen als een accommodatiepartner geen eigen voorwaarden heeft geüpload of bij catering items. De PDF-link is behouden.

## Wat er is gedaan

### 1. AcceptTermsCard.tsx uitgebreid
- Nieuwe prop `accommodationQuotes` toegevoegd
- useEffect uitgebreid om ook accommodatiepartner terms op te halen
- Conditionele UVH weergave geïmplementeerd:
  - Tonen bij catering items
  - Tonen bij accommodatie zonder eigen voorwaarden
  - Niet tonen bij accommodatie met eigen voorwaarden

### 2. DesktopProgramView.tsx & MobileProgramView.tsx
- Prop `accommodationQuotes` doorgegeven aan AcceptTermsCard

### 3. Edge Function update-customer-program
- UVH logging uitgebreid met accommodatie check
- Haalt nu de geselecteerde accommodatie quote op
- Controleert of de partner eigen voorwaarden heeft
- Logt UVH alleen als catering OF accommodatie zonder custom terms

## Bestanden gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `AcceptTermsCard.tsx` | Nieuwe prop, uitgebreide useEffect, conditionele UVH weergave |
| `DesktopProgramView.tsx` | Prop `accommodationQuotes` doorgegeven |
| `MobileProgramView.tsx` | Prop `accommodationQuotes` doorgegeven |
| `update-customer-program/index.ts` | UVH logging met accommodatie check |

## PDF Link behouden
De bestaande PDF link blijft ongewijzigd:
```typescript
const UVH_TERMS_URL = "https://assets.khn.nl/uploads/downloads/UVH_Nederlands_vanaf_2024_2024-10-18-082210_zkdv.pdf";
```
