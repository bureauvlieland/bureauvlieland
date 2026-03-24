

## Plan: Override_people vergelijking normaliseren

### Probleem
Als een klant het deelnemersaantal wijzigt naar een waarde en het daarna terugzet naar het origineel, wordt het alsnog als wijziging gedetecteerd. Dit kan twee oorzaken hebben:
- Klant typt het groepstotaal in (bv. 31) terwijl origineel `null` was → `31 !== null` = wijziging
- Klant wist het veld, maar `null` vs `undefined` type-mismatch

### Oplossing

**`src/hooks/useCustomerProgram.ts` — getPendingChanges normalisatie**

De vergelijking normaliseren zodat:
1. `override_people` gelijk aan het groepstotaal (`number_of_people`) wordt behandeld als `null` (= geen override)
2. `null` en `undefined` als gelijk worden behandeld

```typescript
// Normaliseer: als override === groepstotaal, behandel als null (geen override)
const normalizeOverride = (val: number | null | undefined, groupTotal: number) => {
  if (val == null || val === groupTotal) return null;
  return val;
};

const normalizedCurrent = normalizeOverride(item.override_people, program.number_of_people);
const normalizedOriginal = normalizeOverride(original.override_people, program.number_of_people);

if (normalizedCurrent !== normalizedOriginal) {
  // ... push change
}
```

Dit voorkomt ook dat onnodige mails naar partners worden verstuurd.

### Bestanden
1. `src/hooks/useCustomerProgram.ts` — normalisatie in `getPendingChanges()`

