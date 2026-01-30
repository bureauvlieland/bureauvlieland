
# Plan: Referentienummer Logiesaanvraag en Bewerkmogelijkheid

## Samenvatting
Dit plan lost twee ontbrekende functionaliteiten op in het klantportaal:
1. Het referentienummer van de logiesaanvraag wordt niet getoond
2. De klant kan de logiesaanvraag niet aanpassen

---

## Deel 1: Referentienummer Logiesaanvraag Tonen

### Huidige situatie
- `accommodationReferenceNumber` wordt correct doorgegeven als prop naar `ProgramOverviewCard`
- De prop wordt echter NIET weergegeven in de UI - alleen het programma referentienummer wordt getoond

### Oplossing
In `ProgramOverviewCard.tsx`, het logies referentienummer toevoegen naast het programma referentienummer in de header:

```
Jouw zakelijke programma op Vlieland  #BV-2601-0001  #LOG-2601-0001
                                       ↑ programma    ↑ logies
```

### Technische wijziging

**Bestand: `src/components/customer-portal/ProgramOverviewCard.tsx`**

Bij de header (rondom regel 133-137) het logies referentienummer toevoegen:

```tsx
{referenceNumber && (
  <Badge variant="outline" className="font-mono text-xs">
    #{referenceNumber}
  </Badge>
)}
{accommodationReferenceNumber && (
  <Badge variant="outline" className="font-mono text-xs border-primary/30">
    <BedDouble className="h-3 w-3 mr-1" />
    #{accommodationReferenceNumber}
  </Badge>
)}
```

---

## Deel 2: Logiesaanvraag Aanpassen

### Huidige situatie
- Klant kan programma datums en aantal personen wijzigen via `EditProgramDetailsDialog`
- Bij datumwijziging worden de logies datums automatisch gesynchroniseerd (via edge function)
- MAAR: er is geen expliciete bewerk-optie in de `AccommodationSection` waar de klant de logiesaanvraag direct kan aanpassen
- Specifieke logies-velden (aantal gasten, type accommodatie, speciale wensen) kunnen niet worden gewijzigd

### Oplossing
Een "Bewerken" knop toevoegen aan de `AccommodationSection` "In behandeling" state die de `EditProgramDetailsDialog` opent met een duidelijke indicatie dat ook de logies wordt aangepast.

### Technische wijzigingen

**A. AccommodationSection.tsx - Bewerk knop toevoegen**

In "State 4: Waiting for quotes" een bewerk-knop toevoegen:
- Knop: "Gegevens wijzigen"
- Opent de `EditProgramDetailsDialog`
- Datums en aantal personen kunnen worden gewijzigd (deze worden automatisch gesynchroniseerd naar de accommodatie)

Toevoeging aan props:
```tsx
interface AccommodationSectionProps {
  accommodation: AccommodationRequest | null;
  quotes: AccommodationQuote[];
  onSelectQuote: (quoteId: string) => Promise<boolean>;
  selectedDates: Date[];
  onEditAccommodation?: () => void; // NIEUW
}
```

**B. DesktopProgramView.tsx & MobileProgramView.tsx**

Prop `onEditAccommodation` doorgeven die de `EditProgramDetailsDialog` opent:

```tsx
<AccommodationSection
  accommodation={accommodation}
  quotes={accommodationQuotes}
  onSelectQuote={onSelectAccommodationQuote}
  selectedDates={selectedDates}
  onEditAccommodation={onOpenEdit} // Koppel aan bestaande edit dialog
/>
```

**C. Optioneel: Specifieke logies-velden bewerken**

Als de klant meer dan alleen datums en aantal personen moet kunnen wijzigen (zoals type accommodatie, speciale wensen), dan is een aparte `EditAccommodationDialog` nodig. Dit valt buiten scope van dit plan maar kan later worden toegevoegd.

---

## Wijzigingsoverzicht

| Bestand | Wijziging |
|---------|-----------|
| `ProgramOverviewCard.tsx` | Logies referentienummer badge toevoegen |
| `AccommodationSection.tsx` | Bewerk-knop + onEditAccommodation prop toevoegen |
| `DesktopProgramView.tsx` | onEditAccommodation prop doorgeven |
| `MobileProgramView.tsx` | onEditAccommodation prop doorgeven |

---

## Flow na implementatie

```
┌──────────────────────────────────────────────────────────┐
│ ProgramOverviewCard                                      │
│                                                          │
│ Jouw zakelijke programma    #BV-2601-0001  🛏 #LOG-0001  │
│                                            ↑ NIEUW       │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│ AccommodationSection (In behandeling)                    │
│                                                          │
│ 📅 10-12 feb  👥 25 gasten  🏨 Hotel  🛏 8 kamers        │
│                                                          │
│ ⏳ We verzamelen offertes voor je...                     │
│                                                          │
│ [Gegevens wijzigen]  ← NIEUW                            │
└──────────────────────────────────────────────────────────┘
                          │
                     klikt op knop
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│ EditProgramDetailsDialog                                 │
│                                                          │
│ Pas datum(s) en aantal personen aan.                     │
│ ⚠️ Logiesaanbieders worden geïnformeerd bij wijzigingen │
└──────────────────────────────────────────────────────────┘
```

---

## Resultaat voor de klant

1. **Referentienummer zichtbaar**: Bij de header ziet de klant nu BEIDE referentienummers - handig voor communicatie met Bureau Vlieland
2. **Bewerken mogelijk**: Klant kan via de "Gegevens wijzigen" knop datums aanpassen, en de logies wordt automatisch gesynchroniseerd + partners genotificeerd
