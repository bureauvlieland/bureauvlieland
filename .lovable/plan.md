
# Plan: Tekstcorrecties Klantportaal

## Problemen

### 1. Formele aanspreking
- **Locatie**: `ProgramOverviewCard.tsx` regel 135
- **Huidige tekst**: "Jouw maatwerkvoorstel"
- **Correcte tekst**: "Uw maatwerkvoorstel"

### 2. Activiteiten checkbox onnodig getoond
- **Locatie**: `StepContact.tsx` regels 86-106
- **Situatie**: Wanneer een klant via het klantportaal naar de logies-wizard navigeert, heeft deze al activiteiten. De checkbox "Wij willen ook activiteiten boeken" is dan overbodig en verwarrend.
- **Oplossing**: Checkbox verbergen wanneer `linkedProgramToken` aanwezig is

---

## Technische Implementatie

### Wijziging 1: ProgramOverviewCard.tsx

```tsx
// Regel 135 aanpassen van:
{isQuoteMode ? "Jouw maatwerkvoorstel" : "Jouw zakelijke programma op Vlieland"}

// Naar:
{isQuoteMode ? "Uw maatwerkvoorstel" : "Jouw zakelijke programma op Vlieland"}
```

### Wijziging 2: StepContact.tsx

De component krijgt een nieuwe prop om te bepalen of de activiteiten-checkbox getoond moet worden:

```tsx
interface StepContactProps {
  formData: AccommodationWizardData;
  updateFormData: (updates: Partial<AccommodationWizardData>) => void;
  hideActivitiesOption?: boolean;  // NIEUW
}

// In de component:
{!hideActivitiesOption && (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
    {/* Activiteiten checkbox */}
  </div>
)}
```

### Wijziging 3: AccommodationWizard.tsx

De nieuwe prop doorgeven aan StepContact:

```tsx
<StepContact 
  formData={formData} 
  updateFormData={updateFormData} 
  hideActivitiesOption={!!linkedProgramToken}  // Verberg als gekoppeld aan bestaand programma
/>
```

---

## Bestanden te wijzigen

| # | Bestand | Wijziging |
|---|---------|-----------|
| 1 | `src/components/customer-portal/ProgramOverviewCard.tsx` | "Jouw" → "Uw" in regel 135 |
| 2 | `src/components/accommodation/steps/StepContact.tsx` | Nieuwe prop `hideActivitiesOption`, conditioneel renderen van checkbox |
| 3 | `src/components/accommodation/AccommodationWizard.tsx` | `hideActivitiesOption` prop doorgeven |

---

## Resultaat

**Voor de fix:**
- Klant ziet "Jouw maatwerkvoorstel" (informeel)
- Klant met bestaande activiteiten ziet nog steeds "Wij willen ook activiteiten boeken"

**Na de fix:**
- Klant ziet "Uw maatwerkvoorstel" (formeel, consistent met rest van communicatie)
- Klant met bestaande activiteiten (via programma-koppeling) ziet de checkbox niet meer
