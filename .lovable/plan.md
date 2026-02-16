

# "Op aanvraag" items tonen €0 in offerte - fix

## Probleem
Items met `price_type === 'on_request'` (zoals "Cafe Boven" en "Overtocht met Rederij Doeksen") tonen nu **€0,00** in de offerte-preview en PDF. Dit komt doordat:

1. `getItemPrice()` retourneert `0` wanneer er geen `admin_price_override` of `quoted_price` is ingesteld
2. De prijskolom in de tabel toont altijd een bedrag, behalve voor `self_arranged` items - er is geen check voor `on_request`

## Oplossing
Twee aanpassingen in `src/pages/admin/AdminQuotePreview.tsx`:

### 1. Prijsweergave in de tabel (regel 749-759)
Naast de bestaande `self_arranged` check, ook een check toevoegen voor `on_request` items **zonder admin_price_override**. Wanneer een item `price_type === 'on_request'` heeft en geen handmatige prijs is ingesteld, toon dan **"Op aanvraag"** in plaats van €0,00.

### 2. Prijstotalen berekening (regel 292-349)
Items met `price_type === 'on_request'` die geen `admin_price_override` hebben, moeten worden uitgesloten van de totaalberekening, net als `self_arranged` items. Dit voorkomt dat er €0,00 regels in de BTW-berekening terechtkomen.

### Technisch detail
De check wordt: als `price_type === 'on_request'` EN `admin_price_override` is `null/undefined`, toon "Op aanvraag". Als er WEL een `admin_price_override` is ingesteld (admin heeft handmatig een prijs opgegeven), dan wordt die prijs gewoon getoond - dit maakt het mogelijk om later alsnog een prijs in te vullen.

### Bestanden die wijzigen
| Bestand | Wijziging |
|---------|-----------|
| `src/pages/admin/AdminQuotePreview.tsx` | Prijsweergave en totaalberekening aanpassen voor `on_request` items |

