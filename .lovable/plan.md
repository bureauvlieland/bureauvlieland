

# Plan: Uitgebreidere financiele informatie op de klantpagina

## Overzicht
Vier verbeteringen aan de klantpagina om klanten meer financieel inzicht te geven:

1. **Kostenspecificatie per activiteit** -- bij elk item in het programma
2. **Dagsubtotalen** -- onder elke dag-tab een totaal tonen
3. **Prijs per persoon** -- in de PriceSummaryCard
4. **Betalingsstatus** -- na acceptatie van voorwaarden

---

## 1. Kostenspecificatie per activiteit (CustomerProgramItem)

**Bestand:** `src/components/customer-portal/CustomerProgramItem.tsx`

Momenteel toont elk item alleen de `quoted_price` als bedrag. Uitbreiden met:
- BTW-tarief badge (bijv. "9% BTW" of "21% BTW") naast de prijs
- Prijstype indicatie: "p.p." of "totaal" op basis van `price_type`
- Excl. BTW bedrag in de uitklapbare details

Hiervoor moet het BTW-tarief per item worden opgehaald. Twee opties:
- **Optie A**: Per item het `vat_rate` ophalen via `block_id` (zoals PriceSummaryCard al doet)
- **Optie B**: Het BTW-tarief meegeven vanuit de parent component

We kiezen **optie A** -- een gedeelde hook/context die de vatRateMap al heeft (uit PriceSummaryCard) doorgeven als prop aan CustomerProgramItem, zodat we niet dubbel fetchen.

Wijzigingen:
- Nieuwe prop `vatRate?: number` toevoegen aan `CustomerProgramItem`
- In de meta-row naast de prijs: `€150,00 (9% BTW)` tonen
- In de uitklapbare details: excl. BTW bedrag + prijstype ("per persoon" / "totaalprijs")
- Parent components (DesktopProgramView, MobileProgramView) geven de vatRateMap door

## 2. Dagsubtotalen

**Bestanden:** `src/components/customer-portal/DesktopProgramView.tsx`, `src/components/customer-portal/MobileProgramView.tsx`

Onder elke dag-tab een subtotaalregel tonen:
- Som van `quoted_price` van alle bevestigde items op die dag
- Excl. en incl. BTW weergave
- Alleen tonen als er bevestigde prijzen zijn op die dag

Implementatie: na de item-loop per dag een `div` met dagtotaal renderen. Berekening in een `useMemo` per dag op basis van de items + vatRateMap.

## 3. Prijs per persoon

**Bestand:** `src/components/customer-portal/PriceSummaryCard.tsx`

Toevoegen aan het grand total blok:
- Regel: "Gemiddeld per persoon: EUR X" (grandTotalInclVat / numberOfPeople)
- Alleen tonen als numberOfPeople > 0 en er bevestigde prijzen zijn
- Subtiel weergeven in `text-muted-foreground`

Ook toevoegen aan de **compact** variant (sidebar):
- Onder het totaal: "ca. EUR X p.p." in kleine tekst

## 4. Betalingsstatus / factuurstatus

**Bestand:** Nieuw component `src/components/customer-portal/PaymentStatusCard.tsx`

Na acceptatie van de voorwaarden (`termsAccepted = true`) een statuskaart tonen met:
- "Facturen worden voorbereid" -- direct na acceptatie
- Optioneel: als `bureau_invoices` beschikbaar zijn, het factuurnummer en bedrag tonen

Aangezien `bureau_invoices` alleen door admins gelezen mag worden (RLS), moeten we een van deze twee routes kiezen:
- **Optie A**: Een edge function maken die op basis van het customer_token de factuurstatus ophaalt (veiliger, meer werk)
- **Optie B**: Simpele statusweergave gebaseerd op de bestaande data (terms_accepted_at aanwezig = "Facturen in voorbereiding"), zonder directe databasetoegang tot bureau_invoices

We kiezen **optie B** voor nu -- een informatieve statuskaart zonder directe factuurdata:
- Geaccepteerd maar nog geen invoiced items: "Facturen worden voorbereid"
- Items met `invoiced_date`: "Factuur verstuurd" met datum
- Alle items invoiced: "Alle facturen verstuurd"

**Integratie:** Toevoegen in `DesktopProgramView` en `MobileProgramView` na de AcceptedTermsCard.

---

## Technische details

### Nieuwe/gewijzigde bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/customer-portal/CustomerProgramItem.tsx` | Props uitbreiden met `vatRate`, BTW-info tonen bij prijs |
| `src/components/customer-portal/DesktopProgramView.tsx` | VatRateMap ophalen, doorgeven aan items, dagsubtotalen tonen |
| `src/components/customer-portal/MobileProgramView.tsx` | Idem als desktop |
| `src/components/customer-portal/PriceSummaryCard.tsx` | Prijs per persoon toevoegen |
| `src/components/customer-portal/PaymentStatusCard.tsx` | **Nieuw** -- factuurstatus na acceptatie |

### Geen database-wijzigingen nodig
Alle benodigde data is al beschikbaar via bestaande tabellen en queries.

