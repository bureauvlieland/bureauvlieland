

## Plan: Deelnemersaantal tonen in berekening op Facturatie-tab

### Probleem
De kostenspecificatie toont nu `€16,16 p.p. = €565,60` zonder te verduidelijken met hoeveel personen er gerekend is. Bij items met een afwijkend aantal (`override_people`) is dat extra verwarrend.

### Aanpassing

**`src/components/customer-portal/PriceSummaryCard.tsx`** — de prijsweergave per orderregel (regel ~278-288):

Huidige weergave:
```
€16,16 p.p. = €565,60
```

Nieuwe weergave:
```
€16,16 p.p. × 35 = €565,60
```

En bij afwijkend aantal (override_people):
```
€32,50 p.p. × 25 = €812,50
```

Dit maakt de berekening volledig transparant. De `ppMultiplier` waarde (= `item.override_people ?? numberOfPeople`) wordt al berekend in de `orderLines` mapping — ik voeg die waarde toe aan het return-object en toon die in de prijskolom.

### Technische wijziging

1. In de `orderLines.map()` (regel 78-98): voeg `peopleCount: ppMultiplier` toe aan het return-object
2. In de render (regel 280-282): wijzig van `€{unitPrice} p.p. = €{effectivePrice}` naar `€{unitPrice} p.p. × {peopleCount} = €{effectivePrice}`
3. Voor `per_person_per_day` items: toon ook de dagvermenigvuldiging: `€{unitPrice} p.p. × {peopleCount} × {days} dgn = €{effectivePrice}`

Eén bestand, minimale wijziging.

