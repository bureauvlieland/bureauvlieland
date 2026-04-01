## Plan: Ingetrokken offertes tonen in kolom "Offertes"

### Probleem

De kolom "Offertes" in het logiesoverzicht toont `ontvangen`, `afgewezen` en `in afwachting`, maar niet `ingetrokken` (withdrawn). Als een admin een offerte-aanvraag bij een partner intrekt, is dat nergens zichtbaar in het overzicht.

### Oplossing

In `src/pages/admin/AdminAccommodation.tsx`:

1. **Type uitbreiden**: `withdrawn: number` toevoegen aan het counts-object (regel 112)
2. **Tellen**: quotes met status `"withdrawn"` meetellen (rond regel 124)
3. **Tonen**: in de render (rond regel 359) een extra indicator toevoegen:
  ```
   · {withdrawn} ingetrokken
  ```
   Met een grijze kleur (`text-slate-500`) om het visueel te onderscheiden van afgewezen (rood) en in afwachting (amber).
4. Ook verwerken in de tekst van de stavaza mail die de admin kan versturen via de logiesaanvraag detailpagina

### Wijzigingen


| Bestand                                  | Actie                                                     |
| ---------------------------------------- | --------------------------------------------------------- |
| `src/pages/admin/AdminAccommodation.tsx` | `withdrawn` toevoegen aan quote-counting + tonen in kolom |


Eén bestand, drie kleine aanpassingen.