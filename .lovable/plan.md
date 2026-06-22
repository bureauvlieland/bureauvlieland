## Probleem

Goede observatie. De PDF naar de klant klopt nu (te voldoen € 407,40), maar de **UBL/XML naar Snelstart klopt niet** — en dat is wat Snelstart boekhoudkundig verwerkt.

In `supabase/functions/forward-bureau-invoice/index.ts` worden bij élke deelfactuur **alle** `program_item_billing_lines` van het project meegestuurd. Dus:

- Factuur **-001** (€ 1.524,75): UBL bevat de **volledige** projectregels → subtotaal € 1.711,99 excl. + **€ 220,16 BTW** (0,00 / 96,16 / 124,00). Snelstart heeft dit zo geboekt.
- Factuur **-002** (€ 407,40): zou met de huidige code **opnieuw** € 1.711,99 excl. + **€ 220,16 BTW** meesturen → **dubbele BTW-boeking** en verkeerd factuurtotaal in Snelstart.

`bureau_invoices` slaat per factuur maar één `amount_excl_vat` + `vat_amount` op, dus de UBL moet zelf de BTW-splitsing per tarief afleiden uit de projectregels.

## Oplossing

### 1. Forward-functie: UBL per deelfactuur schalen

In `forward-bureau-invoice/index.ts` de regels-opbouw vervangen door een proportionele samenvatting per BTW-tarief:

- Bereken uit `program_item_billing_lines` de projecttotalen per tarief: `{ rate → { excl, vat } }` (0% / 9% / 21%).
- Bereken `factor = invoice.amount_excl_vat / projectTotalExcl` (geclamped op 0..1; bij `final` mag dat ook >1 zijn als rounding).
- Genereer **één UBL-regel per tarief** met:
  - `description`: `"{Deelfactuur|Eindfactuur|Creditnota} {invoice_number} — BTW {rate}%"`
  - `amount_excl_vat = round2(rateExcl * factor)`
  - `vat_amount = round2(rateVat * factor)`
- Cent-correctie: corrigeer de laatste regel zodat de som exact gelijk is aan `invoice.amount_excl_vat` en `invoice.vat_amount` (geen ½-cent verschillen tussen PDF en UBL).
- Voor `credit`: zelfde logica, absolute bedragen (UBL CreditNote-semantiek flipt het teken).
- Fallback (geen billing-lines beschikbaar): houd de huidige single-line fallback met `rate = vat_amount / amount_excl_vat`.

### 2. Bestaande factuur -001 in Snelstart

Factuur -001 is met de oude (foute) UBL doorgestuurd: € 1.711,99 excl. + € 220,16 BTW i.p.v. de werkelijke € 1.524,75 incl. Dit moet handmatig in Snelstart gecorrigeerd worden. Twee opties:

- **A (aanbevolen):** -001 in Snelstart aanpassen naar de werkelijke deelfactuurbedragen (€ 1.524,75 incl., met BTW proportioneel: ±€ 0 / € 85,68 / € 110,46 — exacte cijfers worden door de nieuwe logica gegenereerd en kun je 1‑op‑1 overnemen). Daarna -002 opnieuw doorsturen → BTW klopt over beide.
- **B:** -001 in Snelstart crediteren (UBL credit) en -001 opnieuw boeken met de juiste verdeling. Meer audit-spoor, maar zwaarder werk.

Wij doen dit niet automatisch — de keuze ligt bij jou, en het is een handmatige correctie in Snelstart.

### 3. Niet binnen deze stap

- Geen wijziging aan de klant-PDF (die klopt al).
- Geen schemawijziging op `bureau_invoices` (BTW-splitsing per tarief blijft afgeleid uit de projectregels — voldoende zolang de itemset niet wijzigt tussen deelfacturen).
- Geen auto-credit/auto-rebook van -001; dat is een boekhoudkundige beslissing.

## Te wijzigen bestanden

- `supabase/functions/forward-bureau-invoice/index.ts` — regel-opbouw + cent-correctie.

## Verificatie

- Voor het huidige project: handmatig forwarden van -002 (na deploy) → UBL bevat exact 3 regels (0% / 9% / 21%) waarvan de som € 336,69 excl. + € 70,71 BTW = € 407,40 incl. is.
- Som van UBL-bedragen van -001 + -002 = projecttotaal € 1.711,99 excl. + € 220,16 BTW.
