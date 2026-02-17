

## Plan: Altijd-zichtbare actierij per programma-item

### Probleem
Acties zoals verwijderen, tijd wijzigen en akkoord geven zitten verstopt achter de collapsible. De klant moet eerst openklappen om te ontdekken wat er mogelijk is.

### Oplossing
Een compacte actierij toevoegen die altijd zichtbaar is, direct onder de meta-informatie (datum, tijd, prijs). De knoppen zijn contextafhankelijk per status.

### Welke acties per status

| Status | Zichtbare acties |
|--------|-----------------|
| pending / in voorbereiding | Tijd wijzigen, Verwijderen |
| confirmed (niet geaccepteerd) | Akkoord, Andere tijd, Verwijderen |
| alternative | Akkoord, Andere tijd, Verwijderen |
| counter_proposed | Geen (wachten op partner) |
| Geaccepteerd (customer_accepted_at) | Tijd wijzigen, Verwijderen |
| cancelled | Geen |
| self_arranged | Verwijderen |

### Visueel

```text
[Afbeelding] Strandwandeling            [Bevestigd]  [v]
             Aanbieder X
             Dag 1 - 14 mrt  |  10:00  |  1,5 uur  |  €125,00
             [v Akkoord]  [Andere tijd]  [Verwijderen]
```

Compacte knoppen (size="sm") met iconen:
- Akkoord: groene variant met Check-icoon
- Andere tijd: outline met ArrowLeftRight-icoon
- Tijd wijzigen: ghost met Edit2-icoon
- Verwijderen: ghost in destructive kleur met Trash2-icoon

### Technische wijziging

**Bestand: `src/components/customer-portal/CustomerProgramItem.tsx`**

1. Na de inline BTW-rij (rond regel 208) een nieuwe altijd-zichtbare actierij toevoegen met `ml-[76px]`, contextafhankelijk per status
2. Het grote groene/amber bevestigingsblok (regels 248-318) verwijderen - die logica zit nu in de compacte actierij
3. De "Verwijderen" knop onderaan de collapsible (regels 516-528) verwijderen - nu altijd zichtbaar
4. De status-specifieke actieblokken voor "unavailable" (regels 373-393) en "alternative times" (regels 350-371) verwijderen - acties zitten nu in de actierij
5. De collapsible bevat dan alleen nog: beschrijving, locatie, tijd/dag-selectie en notities

De bestaande props (`onAccept`, `onCounterProposal`, `onRemove`, `onUpdate`) en hun functionaliteit blijven identiek. Het is puur een UI-herschikking.

