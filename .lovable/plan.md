

# Overtocht en fietshuur standaard toevoegen aan programma

## Wat

Wanneer een klant begint met het samenstellen van een programma, worden **Overtocht met Rederij Doeksen** (`boot-retour`) en **Fietshuur** (`fiets-huur`) automatisch toegevoegd aan het programma. Deze zijn altijd onderdeel van een Vlieland-bezoek.

## Hoe

### `src/pages/ProgrammaSamenstellen.tsx`

Wanneer de fase wisselt naar `"manual"` (programma bouwen), controleren of `boot-retour` en `fiets-huur` al in de cart zitten. Zo niet, automatisch toevoegen op dag 0. Dit gebeurt:
- Bij keuze "Zelf samenstellen" vanuit EntryChoice
- Na AI-suggestie of template-selectie
- Bij draft-herstel (daar zitten ze waarschijnlijk al in)

Implementatie: een `useEffect` die bij `phase === "manual"` de twee standaard-blokken toevoegt als ze nog niet in de cart zitten. Geen toast voor deze automatische toevoeging (niet afleidend).

### Geen andere bestanden nodig

De blok-IDs `boot-retour` en `fiets-huur` zijn beide `status: published` in de database. De `addToCart` functie in CartContext controleert al op duplicaten.

## Technisch detail

```typescript
const DEFAULT_BLOCK_IDS = ["boot-retour", "fiets-huur"];

useEffect(() => {
  if (phase === "manual") {
    DEFAULT_BLOCK_IDS.forEach(id => {
      if (!isInCart(id)) addToCart(id, 0);
    });
  }
}, [phase]);
```

