

## Fix: Prijsberekening in Kostenspecificatie corrigeren voor per-persoon items

### Probleem
De totalen in de Kostenspecificatie kloppen niet omdat items met `price_type === "per_person"` niet vermenigvuldigd worden met het aantal personen. Een item van €25,00 p.p. bij 9 personen telt nu als €25 in het totaal, terwijl dat €225 zou moeten zijn.

Dit raakt:
1. De **grand total** berekening (regel 125-126)
2. De **BTW-uitsplitsing** (regel 118)
3. De **display** van bedragen per orderregel — nu staat er "€25,00 p.p." maar het totaalbedrag per regel ontbreekt

### Oplossing

**Bestand: `src/components/customer-portal/PriceSummaryCard.tsx`**

1. **Effectieve prijs berekenen per orderregel**: Bij het opbouwen van `orderLines` (regel 78-84), een `effectivePrice` toevoegen die het totaalbedrag per regel is:
   - `per_person`: `quoted_price × numberOfPeople`
   - `total`: `quoted_price`
   - Zelfde logica voor preliminary prices

2. **Grand total aanpassen** (regel 125-126): `confirmedItemsTotal` berekenen met de effectieve (vermenigvuldigde) prijs in plaats van de ruwe `quoted_price`

3. **BTW-berekening aanpassen** (regel 118): `addVat()` aanroepen met de effectieve prijs

4. **Display aanpassen** (regel 249-259): Bij per-persoon items naast "€25,00 p.p." ook het regeltotaal tonen, bijv. "ca. €480,00 totaal" (zoals de watertaxi al correct toont)

### Impact
- Correcte totalen inclusief BTW
- Correcte BTW-uitsplitsing per tarief
- Correcte per-persoon schatting onderaan

