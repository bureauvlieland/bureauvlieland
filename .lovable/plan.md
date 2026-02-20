
## Fix: ActionRequiredCard en ProgramIntroCard verbergen op de Logies-tab

### Probleem

De screenshot toont twee componenten die op de Logies-tab zichtbaar zijn terwijl ze daar niet thuishoren:

1. **`ActionRequiredCard`** — "Aanvragen verstuurd naar aanbieders" — beschrijft de status van het *programma*, niet van de logies
2. **`ProgramIntroCard`** — "Uw programma is bevestigd" — is volledig programmaspecifiek

Beide staan momenteel buiten de `initialSection`-conditionals en worden dus op elke tab gerenderd.

### Oplossing

Wrap beide kaarten in een `initialSection === "program"` conditie in zowel `DesktopProgramView.tsx` als `MobileProgramView.tsx`.

### Exacte wijzigingen

**`DesktopProgramView.tsx` — regels 195-216:**

```tsx
// VOOR:
{/* 2. Action required card */}
<ActionRequiredCard ... />

{/* 3. Intro card */}
<ProgramIntroCard ... />

// NA:
{initialSection === "program" && (
  <>
    {/* 2. Action required card */}
    <ActionRequiredCard ... />

    {/* 3. Intro card */}
    <ProgramIntroCard ... />
  </>
)}
```

**`MobileProgramView.tsx` — regels 226-247:**

Identieke aanpassing — wrap `ActionRequiredCard` + `ProgramIntroCard` in `{initialSection === "program" && (...)}`.

### Wat blijft staan op de Logies-tab

- `ProgramOverviewCard` (datum/pax/kenmerk — tab-onafhankelijke header)
- `AccommodationSection` (logiesinhoud zelf)

### Bestanden gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `src/components/customer-portal/DesktopProgramView.tsx` | Regels 195-216: wrap in `initialSection === "program"` |
| `src/components/customer-portal/MobileProgramView.tsx` | Regels 226-247: wrap in `initialSection === "program"` |
