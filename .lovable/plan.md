

## Plan: Financiële berekeningen corrigeren

### Wat er mis is (5 problemen)

1. **`coordinationFee={0}` hardcoded** in AdminRequestDetail → Marge toont €0
2. **Omzet = incl. BTW, Inkoop = excl. BTW** → appels met peren vergelijking
3. **Betaalde inkoopfacturen uitgesloten** door `status !== "paid"` filter
4. **Coördinatiefee niet in omzet** → Marge Overzicht toont lagere omzet dan Financieel Overzicht
5. **100% marge bij 0 inkoopfacturen** misleidend — er zijn wel partnerkosten maar geen facturen geregistreerd

### Oplossing

**1. AdminRequestDetail.tsx — correcte props doorgeven**
- `coordinationFee` berekenen via `getCoordinationFee(numberOfPeople)` en doorgeven aan `ProjectProfitSummary`
- `bureauInvoicedAmount` inclusief coördinatiefee maken

**2. ProjectProfitSummary.tsx — berekening fixen**
- Inkoopkosten: ALLE purchase invoices meetellen (verwijder `status !== "paid"` filter)
- Alles in dezelfde eenheid: excl. BTW voor zowel omzet als inkoop
- `bureauInvoicedAmount` omzetten naar excl. BTW (of de input al excl. BTW aanleveren)

**3. Verwachte inkoopkosten tonen als er nog geen facturen zijn**
- Als er géén inkoopfacturen zijn maar wél partner-items met prijzen, een "verwachte inkoop" regel tonen op basis van `quoted_price` van externe partner-items
- Dit voorkomt de misleidende 100% marge

### Bestanden
1. `src/pages/admin/AdminRequestDetail.tsx` — correcte `coordinationFee` en `bureauInvoicedAmount` berekenen
2. `src/components/admin/ProjectProfitSummary.tsx` — filter fixen, eenheid gelijktrekken, verwachte kosten toevoegen
3. `src/components/admin/FinancialOverviewCard.tsx` — kleine aanpassing: dezelfde excl. BTW logica gebruiken voor consistentie

### Resultaat
- Omzet en inkoop beiden excl. BTW → vergelijkbaar
- Coördinatiefee correct meegenomen
- Alle inkoopfacturen tellen mee
- Bij ontbrekende inkoopfacturen: verwachte kosten zichtbaar
- Marge% geeft realistisch beeld

