

## Klant-kostenspecificatie syncen met Financieel Overzicht & factuur

### Probleem
Op de klantportaal-pagina toont de **Kostenspecificatie** (`PriceSummaryCard`) wel de basis-logiesprijs, maar **niet de logies-extra's** (bijv. ontbijt, lunch, diner) die wél in:
- het admin Financieel Overzicht staan,
- op de PDF-factuur staan,
- en op de individuele logiesofferte (`AccommodationQuoteItem`) zichtbaar zijn.

Hierdoor ziet de klant een lager totaal dan wat er gefactureerd wordt.

### Wijziging

**Eén bestand: `src/components/customer-portal/PriceSummaryCard.tsx`**

1. **Extras ophalen**: voeg `useQuoteExtras(selectedAccommodationQuote?.id)` toe — dit werkt direct (RLS staat lezen toe voor quotes met status `submitted`/`selected`).

2. **Berekening uitbreiden** in de `useMemo`:
   - Bereken `accommodationExtrasTotal` via `calculateExtrasTotal(extras)` (bestaande helper uit `@/types/accommodationExtras`).
   - Tel dit op bij `accommodationTotal` in `grandTotalInclVat`.
   - Voeg per extra een eigen VAT-regel toe in `allVatLines` (extras hebben een eigen `vat_rate`, vaak 9% en soms 21%) — niet alles op één tarief gooien.

3. **UI-regel toevoegen** direct onder de logies-regel: een sub-blokje "Extra's" met per extra:
   - Naam + eventueel hoeveelheid (`(2× per persoon)` of `(vaste prijs)`)
   - Bedrag
   - Kleine BTW-indicatie
   
   Met onderaan een subtotaal "Logies-extra's: €X,XX". Vergelijkbare opmaak als bestaande billing-lines onder activiteiten.

4. **Compact-variant** (sidebar): tel extras simpelweg op bij het Logies-bedrag, met een onderschrift "incl. extra's" als er extras zijn.

5. **VAT-overzicht onderaan** klopt automatisch omdat extras in `allVatLines` worden meegenomen.

### Resultaat

- Klantportaal Kostenspecificatie = Admin Financieel Overzicht = Factuur-PDF — alle drie tonen dezelfde regels en hetzelfde eindtotaal.
- Logies-extra's zijn voor de klant zichtbaar en transparant verantwoord.
- BTW-breakdown blijft correct gesplitst per tarief.

### Niet in scope
- Geen wijziging aan `AccommodationQuoteItem` (toont extras al correct per offerte).
- Geen wijziging aan admin- of factuurberekening (al goed).
- Geen wijziging aan de partner-portal (geen kostenspecificatie aan partnerzijde — partners zien alleen hun eigen items en offertes).

