
# Plan: Standaardvoorwaarden Bundelen & Alternatieven Accepteren

## Samenvatting
Dit plan lost twee problemen op:
1. **Standaardvoorwaarden bundelen**: Partners met standaardvoorwaarden worden nu drie keer herhaald - deze bundelen in één regel
2. **Alternatieven accepteren**: Klanten kunnen geen "alternative" voorstellen accepteren - de Akkoord-knop toevoegen

---

## Probleem 1: Standaardvoorwaarden Bundelen

### Huidige situatie
```
📄 Standaardvoorwaarden Partneraanbod (Zeehondentochten Vlieland)
📄 Standaardvoorwaarden Partneraanbod (Vliehors Expres)  
📄 Standaardvoorwaarden Partneraanbod (Brouwerij Fortuna)
```

### Gewenste situatie
```
📄 Standaardvoorwaarden Partneraanbod Bureau Vlieland
   Van toepassing op: Zeehondentochten Vlieland, Vliehors Expres, Brouwerij Fortuna
```

### Aanpassing AcceptedTermsCard.tsx

De render-logica aanpassen om:
1. Entries groeperen op `terms_type`
2. Alle `partner_default` entries consolideren in één regel
3. Partnernamen als sublijst tonen onder de standaardvoorwaarden

```
// Groepeer entries
const groupedTerms = useMemo(() => {
  const bureauEntry = acceptedTerms.find(e => e.terms_type === "bureau_vlieland");
  const uvhEntry = acceptedTerms.find(e => e.terms_type === "uvh_2024");
  const defaultEntries = acceptedTerms.filter(e => e.terms_type === "partner_default");
  const customEntries = acceptedTerms.filter(e => e.terms_type === "partner_custom");
  
  return { bureauEntry, uvhEntry, defaultEntries, customEntries };
}, [acceptedTerms]);
```

### Aanpassing AcceptTermsCard.tsx

Dezelfde bundeling toepassen in de checkout-flow:
- Partners met standaardvoorwaarden groeperen
- Eén regel "Standaardvoorwaarden Partneraanbod Bureau Vlieland" tonen
- Daaronder de partnernamen als sublijst

---

## Probleem 2: Alternatieven Accepteren

### Huidige situatie
- De "Akkoord" knop wordt alleen getoond als `item.status === "confirmed"`
- Alternative items krijgen alleen knoppen voor alternatieve tijden (geparsed uit status_note)
- Als de partner een alternatief voorstelt ZONDER specifieke tijden, kan de klant niet akkoord geven

### Gewenste situatie
- Alternative items krijgen ook een "Akkoord" knop
- De klant kan het alternatieve voorstel direct accepteren
- Als er alternatieve tijden zijn, die ook nog tonen als extra opties

### Aanpassing CustomerProgramItem.tsx

Lijn 181 aanpassen om ook `alternative` status te ondersteunen:

```tsx
// Huidige check:
{item.status === "confirmed" && !item.customer_accepted_at && onAccept && (

// Nieuwe check:
{(item.status === "confirmed" || item.status === "alternative") && !item.customer_accepted_at && onAccept && (
```

Daarnaast de tekst aanpassen voor alternative items:
- Bij `confirmed`: "Bevestigd door aanbieder"
- Bij `alternative`: "Alternatief voorstel van aanbieder"

---

## Technische details

### Bestanden die worden aangepast

| Bestand | Wijziging |
|---------|-----------|
| `AcceptedTermsCard.tsx` | Standaardvoorwaarden bundelen in render |
| `AcceptTermsCard.tsx` | Standaardvoorwaarden bundelen in checkout |
| `CustomerProgramItem.tsx` | Akkoord-knop ook tonen voor alternative items |

### AcceptedTermsCard - Nieuwe render structuur

```
┌─────────────────────────────────────────────────────┐
│ De volgende voorwaarden zijn van toepassing:        │
│                                                     │
│ 📄 Bemiddelingsvoorwaarden Bureau Vlieland          │
│    Versie 2026-01 · Bekijken                        │
│                                                     │
│ 📄 Standaardvoorwaarden Partneraanbod               │
│    Van toepassing op:                               │
│    • Zeehondentochten Vlieland                      │
│    • Vliehors Expres                                │
│    • Brouwerij Fortuna                              │
│    Download PDF                                     │
│                                                     │
│ 📄 Voorwaarden Hotel Seeduyn                        │
│    (eigen voorwaarden - custom PDF)                 │
│    Download PDF                                     │
│                                                     │
│ 📄 Uniforme Voorwaarden Horeca 2024 (KHN)           │
│    (indien horeca in programma)                     │
│    Download PDF                                     │
└─────────────────────────────────────────────────────┘
```

### CustomerProgramItem - Alternative acceptance flow

```
┌─────────────────────────────────────────────────────┐
│ 🎯 Zeehondentocht                    [Alternatief]  │
│ Zeehondentochten Vlieland                           │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 💬 Reactie aanbieder:                           │ │
│ │ Op deze datum zijn we niet beschikbaar, maar    │ │
│ │ we kunnen wel op 15:00 in plaats van 10:00.     │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 💬 Alternatief voorstel van aanbieder           │ │
│ │ Totaalprijs: €450,00 incl. BTW                  │ │
│ │                                   [✓ Akkoord]   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Accepteer 15:00] [Andere tijd kiezen]              │
└─────────────────────────────────────────────────────┘
```

---

## Implementatievolgorde

1. **AcceptedTermsCard.tsx** - Bundeling standaardvoorwaarden na akkoord
2. **AcceptTermsCard.tsx** - Bundeling standaardvoorwaarden in checkout
3. **CustomerProgramItem.tsx** - Akkoord-knop voor alternative items

---

## Visuele samenvatting

```
VOOR                                    NA
────────────────────────────────────────────────────────
📄 Standaard (Partner A)                📄 Standaardvoorwaarden
📄 Standaard (Partner B)       →           Van toepassing op:
📄 Standaard (Partner C)                   • Partner A
                                           • Partner B
                                           • Partner C

[Alternative item]                      [Alternative item]
  └── Geen Akkoord-knop       →          └── ✓ Akkoord knop zichtbaar
```
