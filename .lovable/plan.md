
# Plan: Navigatie Anchors + Datum Bewerken Verbeteren ✅ AFGEROND

## Geïmplementeerde Wijzigingen

### 1. Navigatie-items heroverwogen
- ❌ "Details" en "Geschiedenis" verwijderd (niet relevant voor klant)
- ✅ "Logies" toegevoegd (conditioneel, alleen bij meerdaagse programma's)
- ✅ Anchors werken nu correct: `#program`, `#accommodation`, `#billing`

### 2. Datum bewerken duidelijker gemaakt
- ✅ "Bewerken" knop toegevoegd in ProgramOverviewCard header
- ✅ Visueel duidelijk klikbaar voor klant

### 3. Voorlopige kosten tonen
- ✅ InvoiceProvidersCard toont nu ook `admin_price_override` als voorlopige prijs
- ✅ Label "ca." en "Voorlopige prijsindicatie" bij nog niet-bevestigde prijzen

---

## Technische Wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `ProgramNavigation.tsx` | Dynamische sections met `isMultiDay` prop |
| `ProgramOverviewCard.tsx` | `onEdit` prop, "Bewerken" knop in header |
| `InvoiceProvidersCard.tsx` | Fallback naar `admin_price_override`, label voor voorlopige prijzen |
| `DesktopProgramView.tsx` | `id="billing"` wrapper, `onEdit` doorgeven |
| `MobileProgramView.tsx` | `onEdit` doorgeven |
| `CustomerProgram.tsx` | `isMultiDay` prop doorgeven aan navigatie |
