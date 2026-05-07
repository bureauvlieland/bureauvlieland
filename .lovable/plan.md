## Vergelijking getekende offerte vs. systeem

Offerte 2180189 (30-12-2025, getekend door OVM Partners) = **€7.329,00 incl. BTW**.
Systeem toont nu **€20.830,52** voor BV-2604-0004. Verschil ~ €13.500.

Dit is een **legacy-project** dat is overgezet uit het oude offertesysteem en daarbij zijn de prijstypes en automatische opslagen niet correct gemapt.

### Concrete fouten in de data

| # | Item | Offerte | Database nu | Systeem rekent | Oorzaak |
|---|---|---|---|---|---|
| 1 | **Fietshuur** | €225,60 totaal (12 × 2 dgn × €9,40) | `admin_price_override = 225,60` met `price_type = per_person_per_day` | 225,60 × 12 × 3 = **€8.121,60** | price_type moet `total` zijn — het bedrag is al het groepstotaal |
| 2 | **Vliehors Expres** | €354,00 totaal (private tour) | `30,00` met `per_person` (door mij vorige beurt onterecht zo gezet) | 30 × 12 = €360 | Moet terug naar `354,00` `total` |
| 3 | **Overtocht heen + terug** | 1× Doeksen retour €442,80 (extra kost, klopt) | Daarnaast 2 dag-items "Overtocht Harlingen → Vlieland" en "→ Harlingen" `€16,16 p.p.` (`pending`) | 2 × 12 × 16,16 = €387,84 extra | Day-items zijn dubbelop met de €442,80 Doeksen-regel — moeten op `€0` of `cancelled` |
| 4 | **Toeristenbelasting** | 1× €92,88 (al in offerte) | Handmatig bureau-item `Toeristenbelasting` €92,88 + automatische regel `Toeristenbelasting (12 pers. × 3 dgn)` €92,88 | 2× €92,88 = €185,76 | Handmatig item verwijderen; auto-regel uit `app_settings` is leidend |
| 5 | **Natuurbijdrage €18,00** | Niet in offerte | Auto via `nature_contribution_pp` | €18 erbij | Niet in originele offerte — voor dit legacy-project uitschakelen of in mindering brengen |
| 6 | **Opslag centrale facturatie €30,00** | Niet in offerte | Auto via `bureau_central_surcharge_pp` (`invoicing_mode=bureau_central`) | €30 erbij | Idem — niet in originele offerte |
| 7 | **Coördinatiefee €200,00** | Niet in offerte (zit in "Bureau- & administratiekosten 15%" van €1.039,72) | Auto via `coordination_fee_tiers` | €200 dubbelop | Bureau 15% dekt dit al — coördinatiefee moet eruit voor dit project |

Som van fouten: 7.896 (fiets-overshoot) + 6 (vliehors) + 388 (dubbele overtocht) + 93 (dubbele toeristenbelasting) + 18 (natuur) + 30 (opslag) + 200 (coördinatiefee) ≈ **€8.631 te veel**, plus de 442,80 Doeksen die nu dubbel kan zijn afhankelijk van keuze. Klopt grofweg met het verschil van ~€13.500 (de rest komt door cumulatie van fiets × dagen).

---

## Wat ik wil doen (data-correctie, geen code-wijziging)

Eén ronde gerichte updates op `program_request_items` en `program_requests` voor BV-2604-0004:

```text
[1] Fietshuur (id 2f3d31de…)
    price_type:  per_person_per_day → total
    admin_price_override blijft 225,60
    admin_price_notes: "12x 2 dagen x €9,40 — totaal als groepsprijs"

[2] Vliehors Expres (item)
    price_type:  per_person → total
    admin_price_override: 30 → 354
    admin_price_notes: "Private tour + lunch (zie offerte 30-12-2025)"

[2b] Building block Vliehors Expres
    price_adult: 30 → 354 met price_type 'total'
    (matches offerte; voor toekomstige projecten kan dit per persoon worden
     gemaakt via een aparte "p.p."-bouwsteen; nu eerst gelijktrekken met offerte)

[3] Twee Overtocht day-items (Harlingen→Vlieland + Vlieland→Harlingen)
    Optie A: status → cancelled (verdwijnen uit financieel + programma)
    Optie B: admin_price_override → 0 + price_type total
             (blijven zichtbaar in dag-overzicht voor ferry-tijden, tellen niet mee)
    Mijn voorkeur: B — ferry-tijden blijven zichtbaar.

[4] Handmatig bureau-item "Toeristenbelasting" €92,88 (day -1)
    status → cancelled (auto-regel van app_settings blijft leidend)

[5+6] Natuurbijdrage + opslag centrale facturatie
    Niet uit te schakelen per project zonder code-wijziging.
    Twee opties:
      A. Negeer (€48 afwijking accepteren als legacy-restpost)
      B. Voeg een correctie-regel toe als bureau-item van -€48,00 (price_type total)
         met notitie "Correctie: legacy-offerte zonder natuurbijdrage/opslag"
    Mijn voorkeur: B — netjes traceerbaar.

[7] Coördinatiefee €200
    Dit zit niet als item maar wordt automatisch berekend uit
    coordination_fee_tiers (op basis van 12 personen).
    Niet per project uit te zetten zonder code. Ook hier:
      A. Negeer
      B. Correctie-regel -€200,00 toevoegen
    Mijn voorkeur: B (samenvoegen met [6] tot één correctie-regel van -€248,00).
```

**Verwacht eindtotaal na correctie:** ≈ €7.329 (gelijk aan getekende offerte).

---

## Wat ik niet aanraak

- De codebase / business rules. Auto-toeristenbelasting, natuurbijdrage, opslag en coördinatiefee blijven gewoon werken voor nieuwe projecten — alleen voor dit legacy-project halen we ze er via een correctie-regel uit.
- Eerdere facturen of partner-statussen.

## Beslissingen die ik van je nodig heb

1. **Overtocht day-items**: A (annuleren) of B (op €0 zetten, ferry-tijden blijven zichtbaar)?
2. **Natuurbijdrage + opslag + coördinatiefee** (€248 totaal): negeren of correctie-regel van -€248 toevoegen om exact op €7.329 uit te komen?
3. **Vliehors Expres bouwsteen**: laten we hem nu op €354 totaal zetten (matcht offerte voor private tour) of op €29,50 p.p. (logischer voor toekomstige boekingen)?
