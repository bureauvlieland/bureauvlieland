

## Plan: Akkoord-knop tonen voor maatwerk-offertes

### Probleem

De `ProgramIntroCard` controleert `programType === "quote"` om de akkoord-sectie te tonen. Maar maatwerk-programma's hebben `program_type = "maatwerk_zakelijk"` of `"maatwerk_prive"`. Daardoor wordt de akkoord-flow (checkbox + knop) nooit getoond voor maatwerk-offertes, ook al is de `quote_status` correct op `"offerte_verstuurd"` gezet.

De parent-componenten (`DesktopProgramView`, `MobileProgramView`) gebruiken al de juiste check:
```
program_type === "quote" || program_type?.startsWith("maatwerk_")
```

Maar `ProgramIntroCard` zelf doet dat niet.

### Aanpassing

**`src/components/customer-portal/ProgramIntroCard.tsx`** — regel 38

Huidige code:
```typescript
const isQuoteMode = programType === "quote";
```

Nieuwe code:
```typescript
const isQuoteMode = programType === "quote" || !!programType?.startsWith("maatwerk_");
```

Dit is de enige wijziging. Hierdoor wordt de akkoord-sectie (met checkbox "Ik ben akkoord met alle resterende onderdelen" en de knop "Alle resterende akkoord geven") correct getoond voor maatwerk-offertes met status `offerte_verstuurd`.

### Geen verdere wijzigingen nodig

- De `acceptQuoteProposal` functie in `useCustomerProgram.ts` werkt al correct voor alle programmatypes
- De per-item `approveQuoteItem` knop (op individuele items) werkt ook al, mits `isQuoteMode` in de parent-view correct is (en dat is het al)
- De `AcceptQuoteProposalCard` component is niet in gebruik en niet nodig — `ProgramIntroCard` vervult dezelfde rol

