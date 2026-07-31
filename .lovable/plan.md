## Wat er aan de hand is (geverifieerd in de database)

Zuiver Traiteur heeft **12 verkochte onderdelen** (status confirmed/executed) in projecten BV-2602-0002, -0005, -0006, BV-2603-0003, BV-2604-0004, -0010, BV-2605-0001, -0014, BV-2606-0011. In het overzicht zie je er maar 2.

Oorzaak: de werklijst (`get-commission-reconciliation` → `isBillableRow`) verbergt elke regel waarvan `commission_status` gelijk is aan `invoiced`, `paid` **of `not_applicable`**. De kolom `program_request_items.commission_status` heeft in de database de default **`'not_applicable'`**. Die waarde wordt pas op `pending` gezet zodra iemand een inkoopfactuur registreert/koppelt.

Gevolg: 11 van de 12 Zuiver-regels staan nog op de default `not_applicable` en worden dus stilzwijgend uitgefilterd — precies de regels waar nog géén inkoopfactuur bij zit (o.a. Strand BBQ €870, Lunch in de natuur €3.750, Grillmaster €195, Luxe Lunchbuffet €416). Alleen "Luxe Lunchbuffet geserveerd bij Fortuna" (met factuur T-261008, status `pending`) is zichtbaar, plus één losse inkoopfactuur.

Dit is niet partner-specifiek: elke partner mist zo alle regels zonder geregistreerde inkoopfactuur. De tegel "Zonder inkoopfactuur" telt daardoor structureel te laag, en dat is juist het lek dat de reconciliatie zou moeten dichten.

## Wat ik ga doen

1. **Filterlogica corrigeren** in `supabase/functions/_shared/commissionReconciliation.ts`
   - `isBillableRow` behandelt `not_applicable` niet langer als "afgehandeld". Alleen `invoiced` en `paid` sluiten een regel uit, plus expliciete commissievrijstelling (`commissionExempt`, commissievrije partners, 0% commissie).
   - Zo blijft "commissievrij" wél werken via de bestaande `exempt`-status, maar verdwijnt de default-waarde als onbedoeld filter.

2. **Expliciete vrijstelling scheiden van de default**
   - Waar de admin bewust "geen commissie" kiest, wordt dat vastgelegd via `commission_exempt` / 0% in plaats van via de default-status, zodat de twee betekenissen niet langer door elkaar lopen.
   - Optioneel voorstel (jouw keuze bij implementatie): de databasedefault van `commission_status` wijzigen naar `pending` zodat nieuwe regels meteen in de werklijst landen.

3. **Tests toevoegen** (vitest, bij de bestaande recon-tests)
   - Regel met `commission_status = 'not_applicable'` en zonder inkoopfactuur is **wel** billable.
   - Regel met `invoiced`/`paid` blijft uitgesloten.
   - Commissievrije partner (`rederij`, `bureau`) en `commission_exempt = true` blijven uitgesloten.
   - Regressietest met een Zuiver-achtige dataset: 12 verkochte onderdelen → 12 regels in de werklijst, waarvan 10 met status `missing_invoice`.

4. **Controle na deploy**
   - Edge function opnieuw uitrollen en in de UI verifiëren dat Zuiver Traiteur alle regels toont en de tegels "Te factureren" / "Zonder inkoopfactuur" kloppen.

## Technische details

- Betrokken bestanden: `supabase/functions/_shared/commissionReconciliation.ts` (filter), `supabase/functions/get-commission-reconciliation/index.ts` (alleen indien de statuslijst `SOLD_STATUSES` moet worden verruimd), de bijbehorende testsuite.
- Geen wijziging aan de facturatieflow zelf: regels zonder inkoopfactuur krijgen gewoon grondslag "Verkoop" als voorstel, zoals de logica al doet.
- Let op: na de fix zullen er in één klap fors meer openstaande regels in het overzicht verschijnen (historische posten die tot nu toe onzichtbaar waren). Dat is het beoogde effect, maar het vraagt eenmalig opschonen.
