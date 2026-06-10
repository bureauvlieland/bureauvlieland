## Probleem

De **Marge Overzicht**-kaart vergelijkt appels met peren:

| Regel | Wat er staat | Wat het werkelijk is |
|---|---|---|
| Omzet | €13.535,48 | **incl. BTW** |
| Inkoopkosten (5 facturen) | €10.071,57 | **excl. BTW** (som van `amount_excl_vat`) |
| Inkoopfacturen-paneel "Totaal" | €11.669,25 | **incl. BTW** (som van `amount_incl_vat`) |
| Coördinatiefee | +€250 | wordt **dubbel** geteld (zit al in Omzet én wordt nog eens opgeteld bij netto marge) |

Zelfde fout voor commissies: die zitten al in de partnerverkoopprijs ⇒ ook in Omzet, en mogen niet er nog eens **bij** worden opgeteld bij de netto marge.

Resultaat: de marge oogt €3.463,91 (25,6%) terwijl een eerlijke berekening incl. ↔ incl. uitkomt op:

```
Omzet incl.     €13.535,48
Inkoop incl.   −€11.669,25   (5 facturen, panel-totaal)
─────────────────────────
Bruto marge     €1.866,23   (≈13,8% incl. BTW)
```

Excl. BTW ↔ excl. BTW geeft een vergelijkbaar beeld (omzet excl. ≈ €12.245,67 − inkoop excl. €10.071,57 = €2.174,10 ≈ 17,8%).

De huidige weergave geeft een te rooskleurig beeld omdat (a) BTW-grondslagen niet matchen en (b) coördinatiefee/commissies dubbel meetellen.

## Voorstel

Eén consistente weergave op basis van **incl. BTW** (alles in de UI staat al incl.), met optionele excl.-regel ter info. Coördinatiefee en commissies blijven zichtbaar, maar als *informatieve* sub-regels — niet als extra optelsom.

### Nieuwe kaart-layout

```
Marge Overzicht                                          13,8%
─────────────────────────────────────────────────────────────
Omzet (gefactureerd aan klant, incl. BTW)        €13.535,48
   waarvan coördinatiefee                            €250,00
   waarvan partner-commissies (ex BTW)              €  xxx,xx
─────────────────────────────────────────────────────────────
Inkoopkosten partners (5 facturen, incl. BTW)   −€11.669,25
─────────────────────────────────────────────────────────────
Bruto marge (incl. BTW)                          €1.866,23
   ≈ excl. BTW                                   €2.174,10
```

Bij hover/info-tooltip korte uitleg dat BTW per saldo doorloopt en alleen brutomarge over blijft.

### Technische wijzigingen

Alleen `src/components/admin/ProjectProfitSummary.tsx`:

1. Vervang `totalPurchaseCosts` op basis van `amount_excl_vat` door `amount_incl_vat` (en houd een excl.-variant voor de info-regel).
2. Verwijder de `+ coordinationFee` en `+ totalCommissions` uit `netMargin` (die zitten al in `bureauInvoicedAmount`). Toon ze als read-only sub-regels onder Omzet.
3. Label "Omzet" expliciet "incl. BTW"; label "Inkoopkosten" expliciet "incl. BTW"; voeg afgeleide "≈ excl. BTW" toe onder bruto marge (revenue_excl − costs_excl).
4. Percentagebadge = bruto marge incl. / omzet incl. × 100.
5. `expectedPartnerCosts` (fallback als er nog geen inkoopfacturen zijn) interpreteren als incl. BTW (komt uit `quoted_price`, die in onze UI altijd incl. is — kort comment).

Geen wijzigingen in database, edge functions of berekeningen elders. Puur UI/presentatie zodat de getoonde marge klopt met de getoonde omzet en inkoop.
