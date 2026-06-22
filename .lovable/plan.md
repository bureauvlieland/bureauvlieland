## Probleem

Bij een project met al een deelfactuur en €407,40 openstaand:

```text
Openstaand                                 €407,40
[Factuur Maken]   →  toont bestaande factuur 001 (€1.524,75) i.p.v. nieuwe
                     factuur voor €407,40.

Klik "Nieuwe termijn aanmaken"   →  nieuwe nummer FV-...-002, maar de
                                    factuur herhaalt het volledige programma
                                    (€1.932,15) met "reeds gefactureerd
                                    -€1.524,75" eronder. Dat is niet wat je
                                    wilt versturen als slotfactuur.
```

Je wilt: één klik → klaarstaande **slotfactuur voor het openstaande bedrag** (€407,40), met één duidelijke regel, juiste BTW-uitsplitsing en correcte verwijzing naar de eerder verstuurde termijn(en).

## Wat ik ga aanpassen

Alles speelt zich af in `src/pages/admin/AdminInvoicePreview.tsx` en in de "Factuur Maken"-knop in `src/components/admin/FinancialOverviewCard.tsx`. Geen database-wijzigingen.

### 1. Knop "Factuur Maken" stuurt slim door

In `FinancialOverviewCard.tsx`:

- Als er **geen** facturen zijn → `/.../factuur` (huidig gedrag).
- Als er prior facturen zijn **en openstaand > 0** → `/.../factuur?new=1&mode=slot` (direct nieuwe termijn voor het openstaande bedrag).
- Als er prior facturen zijn **en openstaand ≈ 0** → `/.../factuur` (review-modus laatste factuur, huidig gedrag).

### 2. Nieuwe factuurmodus: "Slotfactuur / restantfactuur"

In `AdminInvoicePreview.tsx` lees ik de query-param `mode` (`slot` of `full`, default `full`).

**Bij `mode=slot`** verandert alleen wat op de PDF/preview wordt afgedrukt — de berekening van het programma blijft hetzelfde, maar de **factuurregels** worden vervangen door één regel:

```text
Omschrijving                                          Bedrag
─────────────────────────────────────────────────────────────
Slotfactuur project BV-2605-0001                     €407,40
"…" (klantnaam, datum)                               (incl. BTW)
Restant na reeds gefactureerde termijn FV-…-001
─────────────────────────────────────────────────────────────
Subtotaal excl. BTW                                  €343,xx
BTW 9% over €…                                       €…
BTW 21% over €…                                      €…
Totaal incl. BTW                                     €407,40
```

**BTW-uitsplitsing pro-rata**: ik verdeel het openstaand bedrag over de aanwezige BTW-tarieven in dezelfde verhouding als de totale `vatGroups` van het project. Voorbeeld:

```text
Programma incl BTW totaal       €1.932,15  (9% €1.068,45 / 21% €590,50 / 0% €...)
Openstaand                        €407,40
→ aandeel 9%   = 407,40 * (1.068,45 / 1.932,15)  →  excl./BTW berekend
→ aandeel 21%  = 407,40 * (590,50  / 1.932,15)
→ aandeel 0%   = 407,40 * (rest / 1.932,15)
```

Dit is fiscaal gangbaar voor termijn-/slotfacturen die naar een onderliggende offerte verwijzen. Resultaat klopt op de cent met het openstaand-totaal en BTW-aangifte blijft sluitend over de hele projectreeks.

### 3. Modus-keuze in de UI

Bovenaan de invoice-pagina komt een kleine segmented control (alleen zichtbaar als prior facturen bestaan):

```text
( ● Slotfactuur openstaand €407,40 )  (   Termijn met regels    )
```

- **Slotfactuur openstaand** (default bij `?new=1&mode=slot`): één-regel-modus uit punt 2.
- **Termijn met regels**: huidige weergave (alle programmaregels + "reeds gefactureerd" onderaan).

Schakelen update de `mode` query-param zonder de pagina te herladen. De bestaande "Nieuwe termijn aanmaken"-knop en het bestaande "je bekijkt bestaande factuur"-pad blijven werken.

### 4. Registreren & Snelstart blijven werken

- `SendBureauInvoiceToCustomerDialog` krijgt al `amountExclVat` + `vatAmount` mee. Die voed ik in slot-modus uit de nieuwe slot-totals (€407,40 totaal, met pro-rata excl/btw).
- `invoiceType` wordt op `"partial"` gehouden voor zowel termijn-met-regels als slotfactuur (bestaand veld in `bureau_invoices`). Geen DB-wijziging.
- "Doorsturen naar Snelstart" gebruikt automatisch het juiste bedrag uit het opgeslagen `bureau_invoices`-record.

### Bestanden die geraakt worden

```text
src/components/admin/FinancialOverviewCard.tsx
  └─ slimme route in onClick Factuur Maken

src/pages/admin/AdminInvoicePreview.tsx
  ├─ leest ?mode=slot
  ├─ segmented control bovenin
  ├─ nieuwe render-tak voor mode=slot (één regel + pro-rata BTW)
  └─ totals voor SendBureauInvoiceToCustomerDialog in slot-modus
```

### Buiten scope

- Geen wijziging aan `bureau_invoices`-schema (`invoice_type` blijft `partial`).
- Geen wijziging aan creditfactuur-flow.
- Geen wijziging aan klant-portal of partner-portal.
- Geen wijziging aan de berekening van `outstanding` zelf (komt al uit `calculateUnifiedInvoiceTotals`).

### Vraag voordat ik bouw

Standaard-modus bij klik op "Factuur Maken" met openstaand > 0:
1. **Direct slotfactuur** (mijn voorstel — één klik, één regel, klaar voor versturen).
2. **Modus-keuze tonen** (laat admin elke keer kiezen tussen slot- en regel-modus).

Mijn voorkeur: optie 1, met de segmented control beschikbaar voor de uitzondering.
