

## Plan: Fix "Bevestigen" vs "Alternatief voorstellen" in PartnerItemSheet

### Probleem
Het `PartnerItemSheet.tsx` reactieformulier heeft drie problemen:
1. **Bevestigen** en **Alternatief voorstellen** tonen vrijwel dezelfde UI (beide een tijdkiezer + bezette tijden). Bij "Bevestigen" moet de gewenste tijd gewoon zichtbaar zijn als read-only tekst, niet als dropdown.
2. Bij **Alternatief voorstellen** moet het tijdveld vooringevuld worden met de gewenste tijd (`preferred_time`) en aanpasbaar zijn.
3. De **bezette tijden** in het gele blok tonen items van alle dagen in plaats van alleen de huidige dag. De `sibling_items` worden in de frontend gefilterd op `day_index`, maar de weergegeven eindtijden bevatten de 30-min buffer, wat verwarrend is.

### Oplossing

**Bestand: `src/components/partner-portal/PartnerItemSheet.tsx`**

**1. "Bevestigen" sectie (regels 701-784) vereenvoudigen:**
- Verwijder de tijdkiezer (`<select>`) en het blok met bezette tijden
- Toon in plaats daarvan de gewenste tijd als read-only tekst: "Gewenste tijd: 18:30"
- Bij submit wordt `item.preferred_time` automatisch als `proposedTime` meegestuurd (de partner bevestigt immers de gewenste tijd)
- Houd de prijsvelden en toelichting

**2. "Alternatief" sectie (regels 787-868) verbeteren:**
- Pre-fill `proposedTime` met `item.preferred_time` wanneer het formulier opent (in `handleOpenResponseForm`)
- Houd de tijdkiezer aanpasbaar
- Houd de bezette tijden zichtbaar, maar corrigeer de weergave

**3. Bezette tijden corrigeer weergave:**
- De eindtijd in het gele blok bevat nu de 30-min buffer (bijv. "13:30 - 15:00" terwijl de activiteit tot 14:30 duurt). Toon de werkelijke eindtijd zonder buffer, en vermeld de 30-min marge apart als tekstregel.
- Controleer of de `day_index` filter in de frontend correct werkt (line 101-102) - als `sibling_items` items van alle dagen bevat maar de filter correct is, dan is het probleem visueel; als de filter niet werkt, fix die.

**4. Submit-logica aanpassen (regels 147-198):**
- Bij "confirmed": stuur `item.preferred_time` als `proposedTime` mee (niet het formulierveld)
- Verwijder de tijdvalidatie voor "confirmed" (geen keuze meer nodig)
- Bij "alternative": valideer het formulierveld `proposedTime` zoals nu

### Samenvatting wijzigingen

| Bestand | Wat |
|---|---|
| `src/components/partner-portal/PartnerItemSheet.tsx` | Bevestigen: read-only tijd, geen picker. Alternatief: pre-fill preferred_time. Bezette tijden: toon zonder buffer. Submit-logica aanpassen. |

