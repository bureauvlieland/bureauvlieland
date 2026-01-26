

# Plan: Terminologie & Optimalisaties Klantportaal

## Overzicht

Dit plan bevat verbeteringen aan de "Jouw Programma" pagina om consistentie in terminologie te waarborgen, dubbele informatie te verminderen en de gebruikerservaring te optimaliseren.

## Wijzigingen

### 1. Terminologie Consistentie

**Bestand: `DesktopProgramView.tsx` & `MobileProgramView.tsx`**
- Wijzig "Je Programma" naar "Jouw Programma" voor consistentie met de rest van de applicatie

**Bestand: `PriceSummaryCard.tsx`**
- Wijzig "Partner activiteiten" naar "Activiteiten aanbieders" voor duidelijkheid

**Bestand: `StatusSummary.tsx`**
- Voeg meervoudsvorm toe: "1 alternatief" vs "2 alternatieven"
- Voeg meervoudsvorm toe: "1 bevestigd" vs "2 bevestigd" (blijft "bevestigd")
- Voeg meervoudsvorm toe: "1 wachtend" vs "2 wachtend" (blijft "wachtend")

**Bestand: `AcceptTermsCard.tsx`**
- Verwijder de generieke tekst "Let op: voor de activiteiten van partners zijn hun eigen algemene voorwaarden van toepassing..." wanneer er daadwerkelijk specifieke partner voorwaarden zijn gevonden en getoond

### 2. "Nieuw" Badge voor Toegevoegde Items

**Bestand: `CustomerProgramItem.tsx`**
- Voeg een "Nieuw" badge toe voor items die door de klant zijn toegevoegd maar nog pending zijn
- Badge wordt getoond wanneer het item status "pending" heeft én recent is aangemaakt (binnen afgelopen 24 uur of via een `isNewlyAdded` flag)

**Bestand: `ItemStatusBadge.tsx`**
- Voeg optioneel een "new" variant toe of gebruik een aparte badge naast de status

### 3. Mobile UX Optimalisatie

**Bestand: `MobileProgramView.tsx`**
- Verwijder de standalone `StatusSummary` component op mobile
- De status-informatie is al aanwezig in de `NextStepsCard` en wordt dus dubbel getoond
- Houd alleen de `NextStepsCard` die de volledige flow begeleidt

---

## Bestandsoverzicht

| Bestand | Wijziging |
|---------|-----------|
| `src/components/customer-portal/DesktopProgramView.tsx` | "Je Programma" → "Jouw Programma" |
| `src/components/customer-portal/MobileProgramView.tsx` | "Je Programma" → "Jouw Programma", verwijder dubbele StatusSummary |
| `src/components/customer-portal/PriceSummaryCard.tsx` | "Partner activiteiten" → "Activiteiten aanbieders" |
| `src/components/customer-portal/StatusSummary.tsx` | Meervoudsvorm voor "alternatief" |
| `src/components/customer-portal/AcceptTermsCard.tsx` | Verwijder dubbele voorwaarden-tekst |
| `src/components/customer-portal/CustomerProgramItem.tsx` | "Nieuw" badge voor toegevoegde items |

---

## Voorbeelden

### StatusSummary met meervoud

```text
Huidige situatie:
"2 alternatief"

Na wijziging:
"2 alternatieven"
```

### CustomerProgramItem met "Nieuw" badge

```text
┌─────────────────────────────────────────────────────────┐
│ [img] Zeehondensafari                    [Nieuw] [⏳]   │
│       10:00 • 2 uur                                     │
│       Rederij Vlieland                                  │
└─────────────────────────────────────────────────────────┘
```

### Mobile zonder dubbele StatusSummary

```text
Huidige situatie:
┌─────────────────────────┐
│ StatusSummary           │  ← Dubbel
├─────────────────────────┤
│ NextStepsCard           │  ← Bevat ook status
├─────────────────────────┤
│ Program content...      │
└─────────────────────────┘

Na wijziging:
┌─────────────────────────┐
│ NextStepsCard           │  ← Enige status weergave
├─────────────────────────┤
│ Program content...      │
└─────────────────────────┘
```

---

## Volgorde van Implementatie

1. **Terminologie** - Alle tekstuele wijzigingen doorvoeren
2. **AcceptTermsCard** - Dubbele voorwaarden-tekst verwijderen
3. **StatusSummary** - Meervoudsvormen implementeren
4. **CustomerProgramItem** - "Nieuw" badge toevoegen
5. **MobileProgramView** - Dubbele StatusSummary verwijderen

