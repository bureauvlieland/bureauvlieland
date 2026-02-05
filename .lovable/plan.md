
# Plan: Integratie Kamersoorten & Extra's in Bestaande Componenten

## Samenvatting
Na de uitbreidingen met Extra's Presets en Kamersoorten zijn er enkele plekken waar deze nieuwe data nog beter benut kan worden. Dit plan richt zich op drie verbeteringen:

1. **Handleidingen uitbreiden** - Partners informeren over nieuwe functionaliteit
2. **Extra Presets integreren in AddQuoteExtraDialog** - Sneller toevoegen vanuit presets
3. **Kamersoort details verrijken in klantweergave** - Optioneel: faciliteiten en m² tonen

---

## 1. Handleidingen Uitbreiden (PartnerGuides.tsx)

### Huidige Situatie
De handleidingen bevatten secties over:
- Account activeren
- Aanvragen beheren
- Beschikbaarheid instellen
- Commissiemodel

### Toevoeging
Twee nieuwe secties voor logiespartners:

**Sectie: "Kamersoorten configureren"**
- Hoe kamersoorten aan te maken met m², bedconfiguratie, faciliteiten
- Hoe deze te hergebruiken bij offertes
- Voordeel: sneller en consistenter offertes maken

**Sectie: "Extra diensten beheren"**
- Hoe extra presets (lunch, diner, parkeren) aan te maken
- Hoe deze toe te voegen aan logiesoffertes
- Commissie-informatie over extras

---

## 2. Extra Presets in AddQuoteExtraDialog

### Huidige Situatie
`AddQuoteExtraDialog.tsx` laat partners handmatig extras invoeren bij een offerte.

### Verbetering
Quick-select sectie toevoegen die presets uit `partner_extra_presets` laadt:

```
┌────────────────────────────────────────────────────────────┐
│ Extra toevoegen                                       [✕]  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Snelle selectie uit uw presets:                            │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 🍽️ Lunch (€22,50 p.p.)                    [Toevoegen]│    │
│ │ 🍽️ 3-gangendiner (€47,50 p.p.)           [Toevoegen]│    │
│ │ 🚗 Parkeren Harlingen (€150,- vast)      [Toevoegen]│    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ─── Of handmatig invoeren ─────────────────────────────    │
│ Naam: [                                   ]                 │
│ ...                                                         │
└────────────────────────────────────────────────────────────┘
```

### Technisch
- Import `usePartnerExtraPresets` in `AddQuoteExtraDialog`
- Render presets als klikbare buttons boven het formulier
- Bij klik: vul alle velden automatisch in en submit direct (of pre-fill formulier)

---

## 3. Kamersoort Details in Klantweergave (Optioneel)

### Huidige Situatie
De `AccommodationQuoteDetailSheet` (klantportaal) toont alleen basis info:
- Kamernaam
- Aantal × bezetting
- Prijs per nacht

### Mogelijke Verrijking
Als we de kamersoort-ID meesturen in de `room_configuration`:

```tsx
// In room_configuration opslaan:
{
  type: "Tweepersoonskamer Superior",
  room_type_id: "uuid-hier",  // <- nieuw veld
  count: 5,
  price_per_night: 125,
  occupancy: 2
}
```

Dan kan de klantweergave extra details ophalen:
- Oppervlakte (28 m²)
- Bedconfiguratie (1 queensize bed)
- Faciliteiten (WiFi, TV, Balkon)
- Eventueel een foto

### Overwegingen
**Pro:** Klant ziet rijkere informatie over de kamers
**Con:** Complexer, vereist aanpassing in data-opslag

**Aanbeveling:** Dit als vervolgstap markeren, niet nu implementeren. De basis integratie bij het aanmaken van offertes werkt al.

---

## Implementatievolgorde

### Fase 1 (Prioriteit Hoog)
1. **PartnerGuides.tsx** - Documentatie uitbreiden met nieuwe secties
   - Bestand: `src/pages/PartnerGuides.tsx`
   - Wijziging: Twee secties toevoegen onder bestaande content

### Fase 2 (Prioriteit Medium)
2. **AddQuoteExtraDialog.tsx** - Presets quick-select toevoegen
   - Bestand: `src/components/partner-portal/AddQuoteExtraDialog.tsx`
   - Wijziging: Presets laden en renderen als snelle keuze

### Fase 3 (Toekomstig)
3. Kamersoort details in klantweergave - Later evalueren of dit meerwaarde heeft

---

## Niet Nodig om Nu te Wijzigen

Na analyse blijken de volgende onderdelen **niet** te hoeven worden aangepast:

| Component | Reden |
|-----------|-------|
| `PriceSummaryCard` | Berekent al correct op basis van bestaande quote data |
| `FinancialOverviewCard` | Logies data komt via `selectedAccommodationQuote` |
| `AdminCommissions` | Commissie wordt berekend op `quoted_price`, niet op room types |
| `PartnerFinancialSummary` | Werkt op item-niveau, niet op kamer-niveau |
| `AccommodationSection` | Toont offerte-data die al correct is opgeslagen |

De nieuwe kamersoorten en extra presets zijn "bron-data" die partners helpen om sneller en consistenter offertes in te vullen. De uiteindelijke offerte-data (`accommodation_quotes`) wordt daarna onafhankelijk opgeslagen en gebruikt door alle andere componenten.

---

## Resultaat

Na implementatie:
- Partners begrijpen hoe ze de nieuwe functionaliteit gebruiken (documentatie)
- Partners kunnen bestaande extra-presets direct selecteren bij het invullen van offertes (efficiëntie)
- De data-flow blijft intact: presets → offerte → financiële overzichten
