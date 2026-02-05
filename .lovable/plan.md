
# Plan: Partner Extra Presets + Commissie Per Extra ✅ GEÏMPLEMENTEERD

## Samenvatting
Dit plan bevat drie onderdelen:
1. **Bug fix**: Commissiepercentages worden nu niet correct overgenomen bij accommodatie-offertes
2. **Extra commissie veld**: Admin kan per extra het commissiepercentage instellen
3. **Partner presets**: Partners kunnen extra's opslaan als sjablonen voor hergebruik

---

## 1. Bug Fix: Commissiepercentages bij Offertes

### Probleem Geïdentificeerd
Bij het aanmaken en indienen van accommodatie-offertes wordt het `commission_percentage` niet ingesteld:
- `send-accommodation-quote-request/index.ts` maakt quotes zonder commissiepercentage
- `PartnerAccommodation.tsx` update de quote zonder commissiepercentage

### Oplossing

**Bestand: `supabase/functions/send-accommodation-quote-request/index.ts`**
```typescript
// Bij het aanmaken van quotes, haal partner commissiepercentage op
const quotesToCreate = partner_ids.map((partnerId) => {
  const partner = partners.find(p => p.id === partnerId);
  return {
    request_id,
    partner_id: partnerId,
    accommodation_name: "",
    price_total: 0,
    valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "pending",
    commission_percentage: partner?.accommodation_commission_percentage ?? 10,
  };
});
```

---

## 2. Commissie Per Extra

### Database Wijziging

Toevoegen van `commission_percentage` kolom aan `accommodation_quote_extras`:

```sql
-- Voeg commissie percentage toe aan extras
ALTER TABLE accommodation_quote_extras 
ADD COLUMN commission_percentage DECIMAL(5,2) DEFAULT 15;

COMMENT ON COLUMN accommodation_quote_extras.commission_percentage IS 
'Commissiepercentage voor deze extra (standaard 15%, aanpasbaar door admin)';
```

### UI Wijzigingen

**Admin: Commissie aanpassen per extra**

In het admin gedeelte van de accommodatie-details kunnen admins het commissiepercentage per extra aanpassen.

---

## 3. Partner Extra Presets

### Database Schema

**Nieuwe tabel: `partner_extra_presets`**

```sql
CREATE TABLE partner_extra_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'per_person' 
    CHECK (pricing_type IN ('per_person', 'fixed')),
  price_includes_vat BOOLEAN DEFAULT true,
  vat_rate DECIMAL(4,2) DEFAULT 9,
  category TEXT CHECK (category IN ('fb', 'facilities', 'transport', 'other')),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_partner_extra_presets_partner ON partner_extra_presets(partner_id);

-- RLS
ALTER TABLE partner_extra_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own presets" ON partner_extra_presets
  FOR ALL USING (
    partner_id = public.get_partner_id(auth.uid())
  );

CREATE POLICY "Admin full access" ON partner_extra_presets
  FOR ALL USING (public.is_admin(auth.uid()));

-- Trigger
CREATE TRIGGER update_partner_extra_presets_updated_at
  BEFORE UPDATE ON partner_extra_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Partner UI Flow

**In `AddQuoteExtraDialog.tsx`:**

```text
┌─────────────────────────────────────────────────────────────┐
│ Extra toevoegen                                        [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─ Mijn sjablonen ─────────────────────────────────────┐    │
│ │ 🍽️ Lunch (€22,50 p.p.)          [Gebruiken]         │    │
│ │ 🍽️ 3-gangendiner (€47,50 p.p.)   [Gebruiken]         │    │
│ │ 🚗 Parkeren Harlingen (€150)     [Gebruiken]         │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ ─── of maak een nieuwe ────────────────────────────────     │
│                                                              │
│ Naam: [Lunch                     ]                          │
│ Omschrijving: [2-gangenmenu met soep/brood        ]        │
│ ...                                                          │
│                                                              │
│ ☑ Opslaan als sjabloon voor later gebruik                   │
│                                                              │
│                              [Annuleren] [Toevoegen]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Technische Implementatie

### Nieuwe Bestanden

| Bestand | Doel |
|---------|------|
| `src/hooks/usePartnerExtraPresets.ts` | CRUD hooks voor presets |

### Gewijzigde Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/send-accommodation-quote-request/index.ts` | Commissie% bij quote aanmaken |
| `src/components/partner-portal/AddQuoteExtraDialog.tsx` | Presets tonen + "opslaan als sjabloon" |
| `src/types/accommodationExtras.ts` | `commission_percentage` toevoegen |
| `src/hooks/useQuoteExtras.ts` | Commissie% meenemen |
| `supabase/functions/get-admin-commissions/index.ts` | Extra's commissie meenemen in berekening |

### Database Migratie

```sql
-- 1. Commissie percentage bij extras
ALTER TABLE accommodation_quote_extras 
ADD COLUMN commission_percentage DECIMAL(5,2) DEFAULT 15;

-- 2. Partner extra presets tabel
CREATE TABLE partner_extra_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'per_person' 
    CHECK (pricing_type IN ('per_person', 'fixed')),
  price_includes_vat BOOLEAN DEFAULT true,
  vat_rate DECIMAL(4,2) DEFAULT 9,
  category TEXT CHECK (category IN ('fb', 'facilities', 'transport', 'other')),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_partner_extra_presets_partner ON partner_extra_presets(partner_id);

ALTER TABLE partner_extra_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own presets" ON partner_extra_presets
  FOR ALL USING (
    partner_id = public.get_partner_id(auth.uid())
  );

CREATE POLICY "Admin full access" ON partner_extra_presets
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_partner_extra_presets_updated_at
  BEFORE UPDATE ON partner_extra_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. Commissie Berekening Update

**In `get-admin-commissions/index.ts`:**

Voor accommodatie quotes met extra's:
1. Basis accommodatie commissie = `price_total × commission_percentage`
2. Extra's commissie = `SUM(extra_total × extra_commission_percentage)`
3. Totale commissie = Basis + Extra's

---

## 6. Resultaat

Na implementatie:
- ✅ Commissiepercentages worden correct ingesteld bij accommodatie-offertes
- ✅ Elke extra heeft een eigen commissiepercentage (standaard 15%, aanpasbaar door admin)
- ✅ Partners kunnen extra's opslaan als sjablonen voor hergebruik
- ✅ Bij het toevoegen van een extra kan de partner kiezen uit opgeslagen sjablonen
- ✅ Commissie-overzicht toont correct de totale commissie inclusief extra's
