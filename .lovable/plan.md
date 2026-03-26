

## Plan: Afgewezen offertes meenemen in logiesoverzicht

### Probleem
De kolom "Offertes" toont nu alleen `submitted` (ontvangen) van het totaal. Afgewezen offertes (`declined` status) worden niet meegeteld, waardoor het overzicht onvolledig is.

### Oplossing
In `src/pages/admin/AdminAccommodation.tsx` de quote-telling uitbreiden met een `declined` teller en de weergave aanpassen naar bijv. **"2/6 ontvangen · 1 afgewezen"**.

### Wijzigingen

**`src/pages/admin/AdminAccommodation.tsx`**:
1. In de `quoteCounts` query: naast `submitted` ook `declined` tellen per request
2. In de tabelcel "Offertes": declined-telling tonen als die > 0 is, in een rode/muted kleur

Voorbeeld weergave:
- `2/6 ontvangen` → als er geen afwijzingen zijn
- `2/6 ontvangen · 1 afgewezen` → als er wél afwijzingen zijn

