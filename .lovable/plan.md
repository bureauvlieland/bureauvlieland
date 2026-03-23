

## Plan: Fix €0 prijzen die als "Op aanvraag" worden weergegeven

### Probleem

`block.price_adult || null` evalueert `0` als falsy → wordt `null` → toont "Op aanvraag". Zelfde issue bij het opslaan van handmatige prijsinvoer.

### Aanpassingen

**1. `AdminAiProgramDialog.tsx` (regel 165)**
- `block.price_adult || null` → `block.price_adult ?? null`

**2. `ApplyTemplateDialog.tsx` (regel 78)**
- `block.price_adult || null` → `block.price_adult ?? null`

**3. `AdminAddActivitySheet.tsx` (regel 140)**
- `priceOverride ? parseFloat(priceOverride) : null` → `priceOverride !== "" ? parseFloat(priceOverride) : null`

**4. `AdminAddActivitySheet.tsx` (regel 120)**
- `block.price_adult ? String(block.price_adult) : ""` → `block.price_adult != null ? String(block.price_adult) : ""`

**5. `AdminQuotePriceEditor.tsx` (regel 83-84)**
- `formatPrice`: toon `€ 0,00` als prijs `=== 0`, alleen "Op aanvraag" als prijs `=== null`
- Dit werkt al correct (0 is niet null), dus hier hoeft niets te veranderen — het probleem zit puur in het opslaan.

### Samenvatting

Overal `||` vervangen door `??` (nullish coalescing) zodat `0` correct als geldige prijs wordt behandeld. Vier kleine wijzigingen in drie bestanden.

