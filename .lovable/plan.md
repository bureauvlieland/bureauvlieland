## Wat er nu mis gaat

Vergelijking PDF ↔ screenshot:

| Onderdeel PDF | Bedrag | Hoort bij |
|---|---|---|
| Nr 7214 (21-05) | €1.883,10 incl — 9% €1.480,50 excl + 21% €222,60 excl | Project 1 (Salure, dag 1) |
| Nr 7141 (20-05) | €660,55 incl — **9% €546,15 excl + 21% €53,93 excl** | Project 2 (Artcadia, dag 2) |
| Totaal | €2.543,65 incl / €2.303,18 excl | — |

In het scherm vul je voor **Extra project 1 (Artcadia)** in: hoofdbedrag €546,15 @9% (incl €595,30) + één onderdeel €53,93 @21% (incl €65,26). Daar zit het probleem:

1. **Een "Extra project" ondersteunt maar één BTW-tarief op headerniveau.** De "Onderdelen"-rijen worden door de code geïnterpreteerd als een opsplitsing **van** dat headerbedrag (moeten samen oplopen tot €595,30), niet als losse extra BTW-tarieven binnen hetzelfde project. Vandaar de gele melding "Toegewezen €65,26 van €595,30 (verschil €530,05)" — die is in jouw geval onzinnig.
2. **De groene melding onderaan is misleidend.** De check rekent puur in *excl. BTW*: hoofdproject €1.756,82 excl + extra €546,15 excl = €2.302,97 excl, gelijk aan factuur-excl → "Klopt". Maar de €53,93 (21%-deel van bonnetje 7141) wordt zo stilletjes bij het **hoofdproject** geteld in plaats van bij Artcadia. Daarom voelt het verkeerd.
3. **Daarom kun je niet opslaan.** Bij submit wordt het hoofdproject-aandeel berekend als `factuur-incl − extras-incl = 2.543,40 − 595,30 = 1.948,10` incl. Maar je hoofdproject-allocaties tellen op tot €1.883,09 → verschil €65,01 → toast "Verdeling klopt niet". Dat €65,01 is exact het ontbrekende 21%-deel van Artcadia (€65,26 minus afrondingsruis op orderregels).

## Wat ik ga aanpassen

### 1. Extra project ondersteunt nu echt gemengde BTW
`src/components/admin/purchase-invoices/ExtraProjectSplitBlock.tsx`:
- Twee duidelijke modi binnen één blok:
  - **Eén tarief**: blijf header-bedrag + BTW% invullen (huidige flow, voor simpele gevallen).
  - **Gemengd / per onderdeel**: laat header-bedrag leeg en voeg meerdere onderdeel-regels toe (elk met eigen BTW). Het project-totaal wordt dan afgeleid uit de som van de onderdelen (`useDerived`-pad bestaat al in submit).
- Toon onder het blok altijd een mini BTW-specificatie per tarief + totaal incl/excl, zodat je ziet "9% €546,15 excl · 21% €53,93 excl · totaal €660,56 incl".
- De "Toegewezen … van …"-balans toon ik alleen als header-bedrag is ingevuld. Anders verdwijnt de verwarrende €530,05-melding.
- Voor jouw factuur betekent dit: bij Artcadia laat je het header-bedrag leeg en voeg je **twee** onderdeel-regels toe op dag 2 (één @9% €546,15 + één @21% €53,93). Het blok berekent zelf €660,56 incl.

### 2. Hoofdproject-balans rekent met aandeel, niet met factuurtotaal
In `AddPurchaseInvoiceDialog.tsx` (rond regel 980–1120):
- Bereken `primaryIncl = factuurIncl − somExtrasIncl` en `primaryExcl = factuurExcl − somExtrasExcl` ook in de **UI-vergelijking**, niet alleen in submit.
- Toon "Toegewezen €X van €Y (hoofdproject-aandeel)" met Y = `primaryIncl` zodra er extras zijn. Dan zie je live of je hoofdproject-allocaties kloppen met het juiste deelbedrag.
- Pas `matches` aan op dezelfde manier.

### 3. Balans-melding onderaan extras informatiever
Vervang de excl-only "Klopt"-melding door een blok dat zowel **excl als incl** toont, plus een mini-BTW-specificatie:
- Regel 1: "Hoofdproject: €1.756,82 excl / €1.948,10 incl"
- Regel 2: "Extra project 1 (Artcadia): €600,08 excl / €660,56 incl (9% + 21%)"
- Regel 3: "Som = factuurtotaal €2.303,18 excl / €2.543,65 incl ✓"

Groen alleen als zowel excl- als incl-totalen kloppen.

### 4. Submit-validatie blijft, maar foutmeldingen worden helderder
- Foutmelding bij verschil benoemt expliciet of het over hoofdproject-aandeel of extra project gaat, en in incl. BTW.
- Kleine extra: als `useDerived` actief is op een extra project, geef `vat_rate = 0` door naar de backend met `vat_amount` correct gevuld (bestaat al, alleen testen dat het via de nieuwe UI ook zo binnenkomt).

## Geen wijzigingen aan
- Database/RLS/edge functions.
- Het Orderregels-blok en BTW-specificatie helemaal onderaan.
- De `Direct overnemen als factuurregels`-checkbox en blauwe hint.

## Resultaat
Na de wijziging kun je deze Isla Vlieland-factuur zo verwerken:
- **Project Salure (hoofd)**: 2 allocaties op dag 1 — 1.480,50 @9% + 222,60 @21%.
- **Extra project Artcadia**: header leeg laten, 2 onderdeel-allocaties op dag 2 — 546,15 @9% + 53,93 @21%.
- Onderaan zie je groen "klopt" met excl én incl die exact aansluiten op €2.303,18 / €2.543,65.
- Opslaan werkt; er worden 2 inkoopfacturen aangemaakt (één per project) met de juiste mixed-VAT bedragen.
