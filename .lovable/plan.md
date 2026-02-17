

## Extra's beschrijving toevoegen bij logiesaanbieding

Kleine aanpassing in `AccommodationQuoteItem.tsx`: bij de extra's in de collapsible content wordt de `description` van elke extra getoond als die beschikbaar is. Nu toont het alleen categorie, naam en prijs.

### Wat verandert

In het extras-blok (regel 174-185) wordt onder elke extra-regel een optionele beschrijvingsregel toegevoegd:

```
F&B · Ontbijt (20x)                    € 300,00
  Uitgebreid continentaal ontbijtbuffet

Faciliteiten · Vergaderzaal             € 150,00
  Dagdeel inclusief koffie/thee en beamer
```

### Technisch

| Bestand | Wijziging |
|---------|-----------|
| `src/components/customer-portal/AccommodationQuoteItem.tsx` | In de extras map (regels 174-185): onder de flex-row met naam+prijs een conditionele `<p>` toevoegen voor `extra.description` |

Geen nieuwe bestanden, geen database-wijzigingen.
