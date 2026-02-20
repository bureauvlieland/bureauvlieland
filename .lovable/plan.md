
## Overzichtspagina klantportaal verfraaien met fotomosaic

### Huidige situatie

De `CustomerPortalSplash.tsx` begint direct met een welkomsttekst en een amber disclaimer-blok. Er is geen visueel ankerpunt — geen beeld van Vlieland of de activiteiten. De pagina oogt functioneel maar kaal.

### Aanpak

We voegen een **fotomosaic hero-banner** toe bovenaan de splash-pagina, bestaande uit 5 sfeervolle foto's uit de bestaande asset-bibliotheek. Dit geeft de klant direct een beleving van wat Vlieland te bieden heeft.

Daaronder voegen we een smallere, meer uitnodigende welkomstintro toe — minder formeel, meer sfeer.

### Gekozen foto's (5 stuks, mix van activiteiten, landschap en catering)

| Positie | Bestand | Sfeer |
|---------|---------|-------|
| 1 (groot) | `vlieland-landscape.jpg` | Landschap — breed panorama |
| 2 | `cycling-group.jpg` | Activiteit — groepsgevoel |
| 3 | `sunset-dinner.jpg` | Catering — sfeer |
| 4 | `speedboat.jpg` | Activiteit — dynamisch |
| 5 | `beach-activity.jpg` | Strand — zomer |

### Mosaic-layout

```text
┌──────────────────────┬─────────┬─────────┐
│                      │ foto 2  │ foto 4  │
│       foto 1         ├─────────┼─────────┤
│    (groot, links)    │ foto 3  │ foto 5  │
└──────────────────────┴─────────┴─────────┘
```

Op mobiel: een horizontale scrollbare strip van alle 5 foto's naast elkaar (h-40, geen grid).

### Overige aanpassingen

- De welkomsttekst `"Via dit portaal kunt u uw verblijf..."` wordt iets warmer en persoonlijker
- De amber disclaimer verplaatst naar na het welkomstblok (was al aanwezig, positie blijft)
- De rest van de blokken (stappen, logies/programma-cards, contact) blijven volledig ongewijzigd

### Technische details

- Foto's worden direct geïmporteerd vanuit `src/assets/` (geen extra afhankelijkheden)
- Mosaic gebruikt CSS Grid: `grid-cols-[2fr_1fr_1fr]` met `grid-rows-2` voor de twee rechterkolommen
- `object-cover` + `rounded-xl` voor nette afronding
- Alle foto's krijgen `loading="lazy"` behalve foto 1 (`eager` voor LCP)
- Op mobiel (`sm:hidden` / `sm:grid`) een horizontale scrollstrip in plaats van het grid

### Bestand gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `src/components/customer-portal/CustomerPortalSplash.tsx` | Fotomosaic hero toegevoegd bovenaan; 5 asset-imports; welkomsttekst licht bijgesteld |

Geen database-wijzigingen, geen nieuwe componenten, geen nieuwe dependencies.
