

## Probleem: `quoted_price` wordt onterecht vermenigvuldigd met aantal personen

### Oorzaak

De partner vult in het portaal een **totaalprijs** in (het label zegt letterlijk "Totaalprijs (incl. BTW) — Prijs voor X personen"). Maar het systeem vermenigvuldigt deze prijs alsnog met `numberOfPeople` wanneer `price_type === "per_person"`. Bij de Strand BBQ: partner quoot €1.300 totaal → systeem toont €1.300 × 35 = €45.500.

### Oplossing: vereenvoudiging prijslogica

**Regel**: `quoted_price` = altijd het totaalbedrag voor de hele groep (nooit vermenigvuldigen). `admin_price_override` = eenheidsprijs die wél volgens `price_type` wordt vermenigvuldigd.

### Aanpassingen (4 bestanden)

**1. `src/lib/portalPricing.ts`** — `getItemEffectivePrice`
- `quoted_price`: altijd direct gebruiken zonder multiplier
- `admin_price_override`: wél vermenigvuldigen als `price_type` = per_person/on_request

**2. `src/components/customer-portal/PriceSummaryCard.tsx`** — orderLines berekening (regel 78-90)
- Zelfde logica: `quoted_price` = totaal, `admin_price_override` × multiplier
- Display-logica aanpassen: bij quoted_price toon "€1.300,00" (geen "p.p. = totaal"), bij admin_price_override toon "€30,00 p.p. = €1.050,00"

**3. `src/pages/admin/AdminInvoicePreview.tsx`** — `getItemTotal` (regel 243-249)
- `quoted_price` niet vermenigvuldigen, `admin_price_override` wél

**4. `src/pages/admin/AdminQuotePreview.tsx`** — prijsweergave
- Zelfde aanpassing: quoted_price is al totaal

### Samenvatting displayregels

| Situatie | Berekening | Weergave |
|---|---|---|
| Partner heeft geoffreerd (`quoted_price`) | Totaal = quoted_price | "€1.300,00" |
| Admin schatting (`admin_price_override`, per_person) | Totaal = override × personen | "€30,00 p.p. = €1.050,00 (voorlopig)" |
| Admin schatting (`admin_price_override`, total) | Totaal = override | "€300,00 (voorlopig)" |
| Nog geen prijs | — | "—" |

