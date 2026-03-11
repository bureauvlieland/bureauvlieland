

# Filter mandatory blocks uit voorbeeldprogramma's

## Probleem
Bij het laden van een voorbeeldprogramma worden overtochten (boot-enkel-heen/terug) en fietshuur (fiets-huur) meegenomen uit het template, maar deze worden al automatisch toegevoegd door de builder (ProgrammaSamenstellen.tsx, regel 64-71). Dit leidt tot:
- Overtochten met een vooringestelde tijd uit het template, terwijl de klant zelf moet kiezen via de Doeksen API
- Mogelijke duplicaten of conflicten met de auto-added mandatory blocks

## Oplossing
In `templateLoader.ts`: filter de mandatory block IDs (`boot-enkel-heen`, `boot-enkel-terug`, `fiets-huur`) volledig uit bij het laden van template items. De builder voegt deze sowieso automatisch toe op de juiste dagen (heen op dag 1, terug op laatste dag, fiets op dag 1).

## Technische wijziging

### `src/lib/templateLoader.ts`
- Voeg `fiets-huur` toe aan de skip-lijst naast de bestaande ferry IDs
- Filter template items die een van deze IDs hebben, zodat ze niet via het template worden toegevoegd
- De bestaande auto-add logica in `ProgrammaSamenstellen.tsx` handelt deze items correct af

```
const SKIP_BLOCK_IDS = ["boot-enkel-heen", "boot-enkel-terug", "fiets-huur"];
// In de loop: skip items met deze IDs
```

Eén bestand, ~3 regels wijziging.

