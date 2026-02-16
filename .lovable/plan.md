

## Logies-status verduidelijken in de checklist

De checklist in de sidebar toont nu "Logies geregeld" als volledig afgevinkt zodra er een logiesaanvraag is ingediend. Maar dat klopt niet -- de logies is pas echt geregeld wanneer een offerte is gekozen. We splitsen dit op in drie duidelijke toestanden.

### Huidige weergave

```text
[v]  Logies geregeld          <- groen vinkje, ook als er nog geen offerte gekozen is
```

### Verbeterde weergave

```text
Geen aanvraag:        O     Logies regelen
Aanvraag ingediend:   [klok] Offertes worden verzameld
Offerte gekozen:      [v]   Logies geregeld
```

### Technische aanpassingen

**1. StatusSummary.tsx - Nieuwe prop en drie-traps logies-status**

Een nieuwe optionele prop `accommodationStatus` met waarden `"none" | "requested" | "selected"` wordt toegevoegd (naast de bestaande `hasAccommodation` die backward-compatible blijft).

De logies-stap in de checklist toont:
- `"none"`: lege cirkel + "Logies regelen" (grijs)
- `"requested"`: amber klok-icoon + "Offertes worden verzameld" (amber)
- `"selected"`: groen vinkje + "Logies geregeld" (groen)

**2. ProgramSidebar.tsx - Status berekenen**

De bestaande `hasAccommodation` boolean wordt aangevuld met een `accommodationStatus` berekening op basis van de al beschikbare props (`selectedAccommodationQuote` en of er een accommodation request bestaat -- dit laatste moet als nieuwe prop worden doorgegeven).

Nieuwe prop: `accommodation: AccommodationRequest | null` (wordt al doorgegeven aan DesktopProgramView, moet alleen doorgesluisd worden naar de sidebar).

Logica:
```
selectedAccommodationQuote ? "selected" : accommodation ? "requested" : "none"
```

**3. DesktopProgramView.tsx + MobileProgramView.tsx - Prop doorgeven**

De `accommodation` prop wordt doorgegeven aan ProgramSidebar zodat de status berekend kan worden.

### Bestanden

- `src/components/customer-portal/StatusSummary.tsx`: Nieuwe prop + drie-traps rendering
- `src/components/customer-portal/ProgramSidebar.tsx`: Nieuwe prop + statusberekening
- `src/components/customer-portal/DesktopProgramView.tsx`: `accommodation` prop doorgeven aan sidebar
- `src/components/customer-portal/MobileProgramView.tsx`: Idem voor mobiel (als sidebar daar ook gebruikt wordt)
