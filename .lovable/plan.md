

## Activiteiten-status verbeteren in de checklist

De logies-status is nu verbeterd met drie toestanden, maar de eerste stap ("Activiteiten bevestigd") mist nog de tussentoestanden. We voeren alsnog de eerder goedgekeurde verbeteringen door.

### Huidige weergave

```text
O   Activiteiten bevestigd       <- lege cirkel, ook als 3 van 5 al bevestigd zijn
```

### Verbeterde weergave

```text
Pending items:        [klok]  Wachten op aanbieders (3/5 bevestigd)      <- amber
Alternatieven:        [!]     Alternatief voorstel bekijken (3/5)        <- amber
Alles bevestigd:      [v]     Activiteiten bevestigd (5/5)               <- groen
```

### Technische aanpassing

**Bestand: `src/components/customer-portal/StatusSummary.tsx`**

Regels 45-54 worden aangepast. De huidige simpele toggle (cirkel of vinkje) wordt vervangen door drie toestanden:

1. Als `alternative > 0`: amber `AlertCircle` icoon + "Alternatief voorstel bekijken" + teller `(confirmed/total bevestigd)`
2. Als `pending > 0` (geen alternatives): amber `Clock` icoon + "Wachten op aanbieders" + teller `(confirmed/total bevestigd)`
3. Als alles bevestigd: groen `CheckCircle` + "Activiteiten bevestigd" + teller `(total/total)`

De `AlertCircle` import moet worden toegevoegd aan de lucide-react imports.

Geen andere bestanden hoeven te worden aangepast -- alle benodigde props (`confirmed`, `pending`, `alternative`, `total`) zijn al beschikbaar in de component.

