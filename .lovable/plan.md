

## Optimalisaties klantportaal: doublures, logica en usability

### 1. Gedupliceerde VAT-logica extraheren naar shared hook

De `useEffect` voor het ophalen van BTW-tarieven en `getItemVatRate` staan identiek in zowel `DesktopProgramView.tsx` (regels 143-166) als `MobileProgramView.tsx` (regels 140-163). Dit is 25 regels exacte kopie.

**Oplossing:** Nieuwe hook `useItemVatRates.ts` aanmaken die de Supabase-call en lookup-functie bevat. Beide views importeren dan alleen de hook.

### 2. Gedupliceerde computed values extraheren

Beide views berekenen dezelfde afgeleide waarden:
- `termsAccepted`, `billingComplete`, `allConfirmed`
- `isMultiDay`, `hasActiveAccommodation`
- `isQuoteAwaitingApproval`, `isPreApproval`
- `totalCost`

Dat zijn ~40 regels identieke logica in elk bestand.

**Oplossing:** Een `useProgramStatus` hook die al deze berekeningen doet op basis van het program-object. Beide views gebruiken dan:
```tsx
const { termsAccepted, billingComplete, allConfirmed, ... } = useProgramStatus(program, accommodationQuotes, statusSummary);
```

### 3. Tijdlijn-rendering als herbruikbaar component

De tijdlijn-wrapper (verticale lijn + stip + tijdkolom + kaart) wordt 4x gerenderd:
- DesktopProgramView multi-day (regels 352-392)
- DesktopProgramView single-day (regels 412-460)
- MobileProgramView multi-day (regels 379-411)
- MobileProgramView single-day (regels 431-467)

**Oplossing:** Nieuw `ProgramTimeline` wrapper-component specifiek voor het klantportaal:
```tsx
<CustomerTimeline items={dayItems} showTimeColumn={!isMobile}>
  {(item) => <CustomerProgramItem ... />}
</CustomerTimeline>
```

### 4. Overbodige `isEditing` prop verwijderen

De prop `isEditing` in `CustomerProgramItem` wordt gedefinieerd in de interface (regel 36) maar door geen enkele parent op `true` gezet. Dode code.

**Oplossing:** Prop verwijderen uit interface en component.

### 5. Dag-info in meta-rij slim tonen

De meta-rij toont altijd "Dag X - datum", ook bij een eendaags programma waar dit overbodig is (er is maar 1 dag). Bij meerdaags staat de dag al in de DayTabs.

**Oplossing:** De dag-info alleen tonen als `selectedDates.length > 1` EN de collapsible open is, of helemaal niet als de tijdlijn al per dag gegroepeerd is via DayTabs. Op die manier blijft de meta-rij compact.

### 6. Sorteerlogica inconsistent

In de single-day branch worden items gesorteerd op `preferred_time`, maar in de multi-day branch (via `getItemsForDay`) niet. Dit betekent dat items in een meerdaags programma mogelijk in volgorde van aanmaak staan in plaats van chronologisch.

**Oplossing:** Sorteerlogica verplaatsen naar de `getItemsForDay` functie in de parent, of consistent in de tijdlijn-component toepassen. Sorteren op `confirmed_time || proposed_time || preferred_time`.

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useItemVatRates.ts` | Nieuw: gedeelde hook voor VAT-tarieven |
| `src/hooks/useProgramStatus.ts` | Nieuw: gedeelde berekeningen (termsAccepted, allConfirmed, etc.) |
| `src/components/customer-portal/CustomerTimeline.tsx` | Nieuw: herbruikbare tijdlijn-wrapper |
| `src/components/customer-portal/DesktopProgramView.tsx` | Refactor: gebruik hooks + CustomerTimeline, verwijder ~80 regels |
| `src/components/customer-portal/MobileProgramView.tsx` | Refactor: gebruik hooks + CustomerTimeline, verwijder ~80 regels |
| `src/components/customer-portal/CustomerProgramItem.tsx` | Verwijder `isEditing` prop, conditionele dag-info |

### Wat het oplevert

- ~160 regels minder gedupliceerde code
- Consistente sorteer- en weergavelogica
- Eenvoudiger onderhoud: wijzigingen aan tijdlijn of berekeningen hoeven maar op 1 plek
- Geen functionele wijzigingen voor de eindgebruiker, alleen schonere code

