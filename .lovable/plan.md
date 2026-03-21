

## Plan: AI laat ook tijden voorstellen per activiteit

### Huidige situatie

De AI stelt activiteiten voor met alleen `block_id` en `day_index`. Het veld `preferred_time` wordt altijd op `null` gezet bij het toevoegen.

### Aanpassingen

**1. Edge function `generate-program-suggestion/index.ts`**

- Prompt uitbreiden: "Plan activiteiten in logische volgorde op de dag en geef een starttijd mee (HH:MM, 24-uursnotatie). Houd rekening met de duur van elke activiteit."
- Tool-schema uitbreiden met `preferred_time` (string, "HH:MM" formaat) in het `suggestions` array
- Regels toevoegen: ochtend = 09:00-12:00, middag = 12:00-17:00, avond = 17:00+. Geen overlap met eerdere activiteiten op dezelfde dag.

**2. Frontend `AdminAiProgramDialog.tsx`**

- `AiSuggestion` interface uitbreiden met `preferred_time?: string`
- Bij `handleApply`: `preferred_time: s.preferred_time || null` meegeven aan de insert
- In de preview per item de voorgestelde tijd tonen (bijv. "09:00 — Strandwandeling")

### Technische details

Tool-schema aanpassing:
```json
{
  "block_id": { "type": "string" },
  "day_index": { "type": "integer" },
  "preferred_time": { "type": "string", "description": "Start time in HH:MM 24h format" }
}
```

Prompt toevoeging:
```
- Geef elke activiteit een logische starttijd (HH:MM). Plan ze chronologisch op de dag zonder overlap.
- Ontbijt/ochtend: 08:00-09:00, activiteiten overdag: 09:30-17:00, diner/avond: 18:00+
```

