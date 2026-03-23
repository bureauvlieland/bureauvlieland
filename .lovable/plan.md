

## Plan: Standaardprijzen tonen in activiteitenlijst

### Probleem

Bij het toevoegen van activiteiten (via template, AI of handmatig) wordt `admin_price_override` correct gevuld met de bouwsteenprijs. Maar in de niet-offerte weergave (regel 1283-1291) toont de "Prijs"-kolom alleen `item.quoted_price` (de partnerprijs). Die is altijd `null` voor nieuwe items. De `admin_price_override` wordt genegeerd als fallback.

### Aanpassing

**`AdminRequestDetail.tsx` (regel 1283-1291)**

De prijskolom in de operationele weergave aanpassen om `admin_price_override` als fallback te gebruiken wanneer `quoted_price` ontbreekt:

```text
Huidige logica:   quoted_price ? toon prijs : "-"
Nieuwe logica:    quoted_price || admin_price_override != null ? toon prijs : "-"
```

Bij weergave van `admin_price_override` (i.p.v. `quoted_price`) een subtiel label tonen zodat duidelijk is dat het de standaardprijs betreft, niet een partnerofferte.

### Technische details

Eén wijziging in `src/pages/admin/AdminRequestDetail.tsx`, regels 1283-1291:

- Toon `quoted_price` als die bestaat (huidige gedrag)
- Anders: toon `admin_price_override` als die niet null is, met een kleine "standaard" indicator
- Alleen "-" tonen als beide null zijn

