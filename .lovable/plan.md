

## Plan: Consistente klantmelding en item-status bij offerte_verstuurd

### Probleem

De offerte is verstuurd (`offerte_verstuurd`), maar:
- De **intro-tekst** zegt: "U kunt per onderdeel akkoord geven"
- De **items** tonen: "In voorbereiding" (alsof Bureau Vlieland nog bezig is)

Dit is tegenstrijdig. "In voorbereiding" komt doordat `isPreApproval` ook `offerte_verstuurd` omvat — alle pending items krijgen dan dat label. Maar als de offerte al bij de klant ligt, zijn de items niet meer "in voorbereiding" maar ter beoordeling.

### Oorzaak

In `CustomerProgramItem.tsx` (regel 125):
```
isPreApproval && item.status === "pending" ? "In voorbereiding" : undefined
```

`isPreApproval` is `true` voor `concept`, `in_afstemming` én `offerte_verstuurd`. Het label "In voorbereiding" is alleen correct voor `concept` en `in_afstemming`.

### Oplossing

**1. `src/components/customer-portal/CustomerProgramItem.tsx`**

De override-logica splitsen:
- `concept` / `in_afstemming` → "In voorbereiding" (correct)
- `offerte_verstuurd` → **geen override** — toon het `item_quote_status` label (bv. "Onder voorbehoud") of de standaard pending-badge "Aangevraagd"

Concreet: vervang de `isPreApproval` check door een check op `quoteStatus`:
```
quoteStatus && ["concept", "in_afstemming"].includes(quoteStatus) && item.status === "pending" 
  ? "In voorbereiding" 
  : undefined
```

Dit vereist dat `quoteStatus` als prop wordt doorgegeven (nu komt alleen `isPreApproval` boolean mee).

**2. `src/components/customer-portal/StatusSummary.tsx`**

Zelfde aanpassing: "In voorbereiding (X onderdelen)" alleen bij `concept`/`in_afstemming`, niet bij `offerte_verstuurd`.

**3. `src/components/customer-portal/ProgramOverviewCard.tsx`**

Zelfde patroon: "In voorbereiding" label alleen voor pre-offerte fases.

### Bestanden
1. `src/components/customer-portal/CustomerProgramItem.tsx` — label-override beperken tot concept/in_afstemming
2. `src/components/customer-portal/StatusSummary.tsx` — idem
3. `src/components/customer-portal/ProgramOverviewCard.tsx` — idem

