

## Voorbeeldprogramma's: 3 → 4 kaarten

### Wijziging
In `src/components/home/ProgramTemplatesPreview.tsx` wordt de `slice(0, 3)` aangepast naar `slice(0, 4)`. De dedupe-logica op naam blijft staan (voorkomt herhaling als de database ooit opnieuw duplicaten bevat). De query haalt al `limit(8)` op, dus er is voldoende voorraad.

### Visueel effect
- Op `md+` ontstaat een vol 2×2 raster (was 2 + 1 alleen).
- De alternerende `translate-y-12` op oneven kaarten blijft werken: kaart 2 en 4 zakken iets, kaart 1 en 3 staan hoger — geeft het editorial-ritme dat je eerder waardeerde.
- Op mobiel: 4 kaarten onder elkaar in plaats van 3. Geen layout-issue.

### Bestand
| Bestand | Wijziging |
|---|---|
| `src/components/home/ProgramTemplatesPreview.tsx` | `.slice(0, 3)` → `.slice(0, 4)` |

Geen migraties, geen andere componenten geraakt.

