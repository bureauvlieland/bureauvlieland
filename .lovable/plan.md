
## Verwijder permanente Werkdocument-disclaimer

### Wat er nu staat (regels 380–388, `CustomerProgram.tsx`)

```tsx
{/* Decision 3: Werkdocument-disclaimer always visible (not just on splash) */}
<div className="border-b bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
  <div className="container mx-auto px-4 py-2 flex items-center gap-2">
    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
    <p className="text-xs text-amber-800 dark:text-amber-200">
      <strong>Werkdocument</strong> — Onderdelen, aantallen en tijden kunnen we samen verder aanscherpen. Na afstemming maken we het voorstel definitief.
    </p>
  </div>
</div>
```

### Wijziging

Dit blok wordt volledig verwijderd. De disclaimer staat al in de splash-pagina (`CustomerPortalSplash.tsx`) en hoeft niet op elke tab herhaald te worden.

### Impact-check

- `AlertCircle` wordt na verwijdering mogelijk nergens meer gebruikt in dit bestand. Die import wordt dan ook opgeruimd.
- Geen andere componenten of bestanden worden aangeraakt.

### Bestanden gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/CustomerProgram.tsx` | Amber disclaimer-blok verwijderd + eventueel `AlertCircle`-import opgeruimd |
