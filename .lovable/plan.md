## Probleem

Bij het aanmaken van factuurregels voor de overtocht "Harlingen → Vlieland" wordt automatisch **21% BTW** ingevuld. Voor Rederij Doeksen (passagiersvervoer over water) geldt echter **9% BTW**.

## Oorzaak (onderzocht)

De factuurregel-editor (`AdminItemBillingLinesEditor`) vult een nieuwe regel vooraf in met het BTW-percentage uit de gekoppelde **bouwsteen** (`building_blocks.vat_rate`), opgehaald via `useItemVatRates`. Op het programma-item zelf wordt geen `vat_rate` opgeslagen — het komt elke keer uit de bouwsteen.

In de database staan vier ferry-bouwstenen. Twee daarvan hebben een verkeerd tarief:

| id | naam | huidig | correct |
|---|---|---|---|
| `boot-retour` | Overtocht met Rederij Doeksen | 9% | 9% ✓ |
| `bootretour-doeksen-groep` | Bootretour Doeksen (groepstarief) | 9% | 9% ✓ |
| `boot-enkel-heen` | Overtocht Harlingen → Vlieland | **21%** | **9%** |
| `boot-enkel-terug` | Overtocht Vlieland → Harlingen | **21%** | **9%** |

De screenshot toont exact dit item (`boot-enkel-heen`) met 21% voorgevuld. Verder zijn er geen hardcoded 21%-waarden in templates, configurator of edge functions; alles haalt het tarief uit de bouwsteen.

Er bestaan nog **geen opgeslagen factuurregels** voor enkelvoudige overtochten — er hoeft dus geen historische data gemigreerd te worden.

## Plan

### 1. Database-migratie (correctie BTW-tarief)
Update `building_blocks.vat_rate` van `21` → `9` voor:
- `boot-enkel-heen` (Overtocht Harlingen → Vlieland)
- `boot-enkel-terug` (Overtocht Vlieland → Harlingen)

Eventuele andere bouwstenen voor passagiersvervoer (watertaxi etc.) staan al correct op 9%.

### 2. Verificatie
Na de migratie:
- Open een bestaand programma met de overtocht en open "Factuurregels" → controleer dat 9% voorgevuld wordt en het totaal incl. BTW herberekent (€ 416,18 excl. → € 453,64 incl., i.p.v. € 503,58).
- Controleer dat de groeps- en retourvarianten ongewijzigd blijven.

### 3. Geen code-wijzigingen nodig
- `useItemVatRates` werkt al correct (haalt het tarief uit de bouwsteen).
- `AdminItemBillingLinesEditor` rekent uit excl./incl. correct met het meegegeven tarief.
- De fallback van 21% (wanneer een item geen `block_id` heeft) blijft staan als veilige standaard voor losse, niet-gekoppelde regels.

### Optioneel (aanbeveling, niet uitvoeren tenzij akkoord)
Een korte interne notitie in de bouwsteen (`description` of admin-only veld) toevoegen: "BTW 9% (passagiersvervoer Doeksen)" zodat dit voor toekomstige bewerkingen zichtbaar is.

## Impact

- Nieuwe factuurregels voor enkelvoudige overtochten krijgen direct 9% i.p.v. 21%.
- Bestaande programma's: er waren nog geen opgeslagen factuurregels voor deze twee bouwstenen, dus geen herberekening nodig.
- Verkoopfacturen die nog moeten worden gegenereerd zullen automatisch het correcte tarief tonen.
