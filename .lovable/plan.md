
# Plan: Edge Function Deployment Fix + Kamersoorten Configuratie

## Deel 1: Deployment Error Fix

### Probleem
De edge function `get-partner-dashboard` is niet beschikbaar (404 error). Dit veroorzaakt de errors op de Overzicht en Facturatie pagina's in de partneromgeving. De functie bestaat in de codebase maar is niet correct gedeployed.

### Oorzaak
Er is een deployment timeout bij het deployen van de edge functions. Dit kan een tijdelijk systeem probleem zijn.

### Oplossing
De edge functions opnieuw deployen. Als dit blijft falen, kan een simpele code wijziging (bijv. een comment toevoegen) de deployment triggeren.

---

## Deel 2: Kamersoorten Configuratie

Ja, dit is een slimme toevoeging! Logiespartners kunnen dan hun standaard kamersoorten opslaan en hergebruiken bij offertes, vergelijkbaar met de Extra's presets.

### Huidige situatie
Bij het invullen van een logiesofferte moet de partner handmatig kamergegevens invoeren via `room_configuration`:
- type (tekst)
- count (aantal)
- price_per_night (prijs)
- occupancy (bezetting)

Dit is beperkt en vereist telkens opnieuw invoeren.

### Nieuwe functionaliteit
Een "Kamersoorten" beheerpagina waar partners hun kamertypes kunnen configureren met:
- Titel (bijv. "Tweepersoonskamer Superior")
- Omschrijving
- Oppervlakte (m2)
- Bedtype(s) (1 queensize, 2 singles, etc.)
- Faciliteiten (WiFi, TV, balkon, etc.)
- Foto's
- Standaard prijs per nacht
- Maximale bezetting

### Database Schema

**Nieuwe tabel: `partner_room_types`**

```sql
CREATE TABLE partner_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Basis info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Specificaties
  size_sqm INTEGER,
  bed_configuration TEXT,
  max_occupancy INTEGER DEFAULT 2,
  
  -- Faciliteiten als array
  facilities TEXT[] DEFAULT '{}',
  
  -- Foto's
  images JSONB DEFAULT '[]',
  
  -- Prijzen
  price_per_night DECIMAL(10,2),
  price_includes_vat BOOLEAN DEFAULT true,
  vat_rate DECIMAL(4,2) DEFAULT 9,
  
  -- Meta
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_partner_room_types_partner ON partner_room_types(partner_id);

-- RLS
ALTER TABLE partner_room_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own room types" ON partner_room_types
  FOR ALL USING (partner_id = public.get_partner_id(auth.uid()));

CREATE POLICY "Admin full access room types" ON partner_room_types
  FOR ALL USING (public.is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_partner_room_types_updated_at
  BEFORE UPDATE ON partner_room_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Menu Structuur

De sidebar voor logiespartners wordt:

```
- Overzicht
- Logies
- Kamersoorten  ← NIEUW
- Extra's
- Facturatie
- Handleidingen
- Instellingen
```

### Beheerpagina UI

```
┌────────────────────────────────────────────────────────────────┐
│ Kamersoorten                              [+ Nieuw kamertype] │
│ Beheer uw standaard kamersoorten voor logiesoffertes          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ 🛏️ [foto]  Tweepersoonskamer Superior                    │    │
│ │            28m² • 1 queensize bed • Max 2 personen       │    │
│ │            €125,- per nacht                              │    │
│ │            WiFi, TV, Balkon, Minibar                     │    │
│ │                                    [Bewerken] [×]        │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ 🛏️ [foto]  Familiekamer                                  │    │
│ │            42m² • 1 queensize + 2 singles • Max 4 pers   │    │
│ │            €195,- per nacht                              │    │
│ │            WiFi, TV, Zithoek, Kinderbedjes               │    │
│ │                                    [Bewerken] [×]        │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Sheet voor bewerken

```
┌─────────────────────────────────────────────────────────────┐
│ Kamertype bewerken                                     [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Naam: [Tweepersoonskamer Superior    ]                      │
│ Omschrijving: [Ruime kamer met zeezicht...     ]           │
│                                                              │
│ ─── Specificaties ────────────────────────────────────      │
│ Oppervlakte: [28 ] m²                                       │
│ Bedconfiguratie: [1 queensize bed        ]                  │
│ Maximale bezetting: [2] personen                            │
│                                                              │
│ ─── Faciliteiten ─────────────────────────────────────      │
│ ☑ WiFi  ☑ TV  ☑ Balkon  ☑ Minibar  ☐ Airco  ☐ Kluis       │
│ ☐ Waterkoker  ☐ Bad  ☑ Douche  ☐ Rolstoeltoegankelijk      │
│                                                              │
│ ─── Foto's ───────────────────────────────────────────      │
│ [📷 Foto uploaden] [🔗 URL invoeren]                        │
│ [foto1] [foto2] [+]                                         │
│                                                              │
│ ─── Prijs ────────────────────────────────────────────      │
│ Prijs per nacht: [€ 125,00]                                 │
│ BTW: [9 %]  ☑ Inclusief BTW                                 │
│                                                              │
│                              [Annuleren] [Opslaan]          │
└─────────────────────────────────────────────────────────────┘
```

### Integratie in Offerte

Bij het invullen van een logiesofferte (`PartnerAccommodationQuoteSheet.tsx`):

1. Partner ziet lijst van opgeslagen kamersoorten
2. Kan met één klik een kamersoort toevoegen aan offerte
3. Specificeert alleen nog: aantal kamers en eventuele afwijkende prijs
4. Alle details (naam, omschrijving, faciliteiten) worden automatisch ingevuld

```
┌─────────────────────────────────────────────────────────────┐
│ Kamerconfiguratie                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Beschikbare kamertypes:                                      │
│ ┌─ Tweepersoonskamer Superior (€125/nacht) ─ [+ Toevoegen] ┐│
│ ├─ Familiekamer (€195/nacht) ──────────────── [+ Toevoegen] ┤│
│ └─ Eenpersoonskamer ──────────────────────── [+ Toevoegen] ┘│
│                                                              │
│ Geselecteerde kamers:                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Tweepersoonskamer Superior                             │  │
│ │ Aantal: [5 ]  Prijs/nacht: [€ 125,00]          [×]    │  │
│ └────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Familiekamer                                           │  │
│ │ Aantal: [2 ]  Prijs/nacht: [€ 195,00]          [×]    │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Of: [+ Handmatig kamertype toevoegen]                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Technische Implementatie

### Nieuwe Bestanden

| Bestand | Doel |
|---------|------|
| `src/pages/PartnerRoomTypes.tsx` | Beheerpagina voor kamersoorten |
| `src/components/partner-portal/PartnerRoomTypeSheet.tsx` | Sheet voor bewerken/aanmaken |
| `src/hooks/usePartnerRoomTypes.ts` | CRUD hooks voor kamersoorten |
| `src/types/partnerRoomTypes.ts` | TypeScript types |

### Gewijzigde Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/partner-portal/PartnerLayout.tsx` | Menu-item toevoegen |
| `src/App.tsx` | Route toevoegen |
| `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx` | Kamersoorten integratie |

### Standaard Faciliteiten

```typescript
const ROOM_FACILITIES = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'tv', label: 'TV' },
  { value: 'balcony', label: 'Balkon' },
  { value: 'terrace', label: 'Terras' },
  { value: 'sea_view', label: 'Zeezicht' },
  { value: 'minibar', label: 'Minibar' },
  { value: 'airco', label: 'Airconditioning' },
  { value: 'safe', label: 'Kluis' },
  { value: 'kettle', label: 'Waterkoker' },
  { value: 'coffee_machine', label: 'Koffiemachine' },
  { value: 'bath', label: 'Bad' },
  { value: 'shower', label: 'Douche' },
  { value: 'hairdryer', label: 'Haardroger' },
  { value: 'wheelchair', label: 'Rolstoeltoegankelijk' },
  { value: 'pets', label: 'Huisdieren toegestaan' },
];

const BED_CONFIGURATIONS = [
  { value: '1_single', label: '1 eenpersoonsbed' },
  { value: '2_single', label: '2 eenpersoonsbedden' },
  { value: '1_double', label: '1 tweepersoonsbed' },
  { value: '1_queen', label: '1 queensize bed' },
  { value: '1_king', label: '1 kingsize bed' },
  { value: '1_queen_2_single', label: '1 queensize + 2 eenpersoonsbedden' },
  { value: 'bunk', label: 'Stapelbedden' },
];
```

---

## Volgorde van Implementatie

1. **Fase 1 (nu)**: Edge function deployment fix
2. **Fase 2**: Database migratie voor `partner_room_types`
3. **Fase 3**: Kamersoorten beheerpagina (`PartnerRoomTypes.tsx`)
4. **Fase 4**: Integratie in offerte-formulier

---

## Resultaat

Na implementatie:
- De Overzicht en Facturatie pagina's werken weer correct
- Logiespartners kunnen kamersoorten configureren met alle details
- Kamersoorten zijn herbruikbaar bij het invullen van offertes
- Consistente workflow vergelijkbaar met Extra's presets
