

## Plan: Klantportaal programma-items verbeteren

### Drie wijzigingen

**1. "Annuleren" wordt "Verwijderen" per item**

Op regels 382, 535 in `CustomerProgramItem.tsx` staat "Annuleren" als label voor het verwijderen van een individueel item. Dit wordt "Verwijderen" om verwarring met het annuleren van het hele programma te voorkomen.

Locaties:
- Regel 382: `Verwijderen` (bij unavailable status, blijft gelijk - staat al correct)
- Regel 535: label wijzigen van "Annuleren" naar "Verwijderen"

**2. Tijd prominenter weergeven**

In de meta-rij (regel 158-167) wordt de tijdweergave visueel zwaarder gemaakt: `font-semibold text-foreground` in plaats van de huidige muted styling. Hierdoor springt de tijd er direct uit.

**3. Prijs inline bij elk item tonen (i.p.v. alleen in apart overzicht)**

De prijs staat al in de meta-rij (regel 176-194) met `quoted_price` en `price_indication`. Dit werkt goed. Wat ontbreekt is de BTW-uitsplitsing die nu alleen in de collapsible zit (regels 414-428). 

De aanpak: de BTW-uitsplitsing (excl. BTW, BTW-bedrag) compact inline tonen direct onder de prijs in de meta-rij, zodat de klant zonder openklappen al het volledige prijsplaatje ziet. Het aparte PriceSummaryCard blijft bestaan als totaaloverzicht.

### Technische details

**Bestand: `src/components/customer-portal/CustomerProgramItem.tsx`**

| Wat | Regel(s) | Wijziging |
|-----|----------|-----------|
| Tijd bold | 158-167 | Tijd-span krijgt `font-semibold text-foreground` |
| Prijs+BTW inline | Na 194 | Compact BTW-detail onder prijs in meta-rij |
| "Annuleren" -> "Verwijderen" | 535 | Label aanpassen |

De collapsible BTW-sectie (regels 414-428) wordt verwijderd omdat die info nu al zichtbaar is.

