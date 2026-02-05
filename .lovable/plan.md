
# Plan: Logiespartner Extra's Systeem

## Samenvatting
Een systeem waarmee logiespartners (zoals WestCord Strandhotel Seeduyn) extra diensten kunnen toevoegen aan hun accommodatie-offerte. Dit betreft aanvullende F&B en services zoals lunch, diner, parkeren in Harlingen, etc. Deze extra's zijn:
- **Niet openbaar** - komen niet in de configurator voor eindklanten
- **Onderdeel van de offerte** - worden meegenomen in de totaalprijs
- **Traceerbaar** - Bureau Vlieland weet welke extra's verkocht zijn
- **Commissieplichtig** - worden meegenomen in de commissieberekening. Standaard dezelfde commissie als de activiteiten commissie, maar ook aanpasbaar door admin. 

---

## 1. Voorbeelden van Extra's (op basis van screenshot)

| Type | Voorbeelden |
|------|-------------|
| **F&B** | Lunch, 3-gangendiner, Ontbijtbuffet, BBQ, Borrel |
| **Faciliteiten** | Vergaderzaal, Beamer, Flipover |
| **Transport** | Parkeren in Harlingen, Bustransfer |
| **Overig** | Fietshuur, Wellness arrangement |

---

## 2. Database Schema

### Nieuwe tabel: `accommodation_quote_extras`

```text
┌─────────────────────────────────────────────────────────────────┐
│ accommodation_quote_extras                                       │
├─────────────────────────────────────────────────────────────────┤
│ id               UUID PRIMARY KEY                                │
│ quote_id         UUID → accommodation_quotes(id)                 │
│ name             TEXT NOT NULL (bijv. "Lunch")                   │
│ description      TEXT (optioneel, bijv. "2-gangenmenu")          │
│ quantity         INTEGER DEFAULT 1                               │
│ unit_price       DECIMAL NOT NULL (prijs per stuk/persoon)       │
│ pricing_type     TEXT DEFAULT 'per_person' (per_person/fixed)    │
│ price_includes_vat BOOLEAN DEFAULT true                          │
│ vat_rate         DECIMAL DEFAULT 9                               │
│ category         TEXT (fb/facilities/transport/other)            │
│ notes            TEXT (partner notities)                         │
│ sort_order       INTEGER DEFAULT 0                               │
│ created_at       TIMESTAMPTZ                                     │
│ updated_at       TIMESTAMPTZ                                     │
└─────────────────────────────────────────────────────────────────┘
```

**RLS Policies:**
- Partners kunnen hun eigen extra's CRUD'en (via quote ownership)
- Admin heeft volledige toegang
- Klanten kunnen extra's lezen van submitted quotes

---

## 3. UI Componenten

### 3.1 Partner Portaal - Extra's Toevoegen

**Locatie:** `PartnerAccommodationQuoteSheet.tsx` (uitbreiden)

Nieuwe sectie onder de prijs-invoer:

```text
┌──────────────────────────────────────────────────────────────┐
│ Extra diensten & arrangementen                    [+ Extra]  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 🍽️ Lunch (2-gangenmenu)                                 │  │
│ │ €22,50 p.p. × 30 = €675,00                   [Edit] [✕] │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 🍽️ 3-gangendiner                                        │  │
│ │ €47,50 p.p. × 30 = €1.425,00                 [Edit] [✕] │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 🚗 Parkeren Harlingen                                   │  │
│ │ Vast bedrag: €150,00                         [Edit] [✕] │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ────────────────────────────────────────────────────────────  │
│ Subtotaal extra's:                              €2.250,00    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Nieuwe Component: `AddQuoteExtraDialog.tsx`

Dialog om een extra toe te voegen:

```text
┌─────────────────────────────────────────────────────────────┐
│ Extra toevoegen                                        [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Naam: [Lunch                     ]                          │
│ Omschrijving: [2-gangenmenu met soep/brood        ]        │
│                                                              │
│ Categorie: [F&B ▾]                                          │
│                                                              │
│ Prijstype: ○ Per persoon  ● Vast bedrag                     │
│                                                              │
│ Prijs: [€ 22,50]    Aantal/personen: [30]                   │
│                                                              │
│ BTW: [9 %]  ☑ Inclusief BTW                                 │
│                                                              │
│ Totaal: €675,00                                             │
│                                                              │
│                              [Annuleren] [Toevoegen]        │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Klant Portaal - Extra's Weergave

**Locatie:** `AccommodationQuoteCard.tsx` en `AccommodationQuoteDetailSheet.tsx`

Toon extra's onder de basis-prijs:

```text
┌──────────────────────────────────────────────────────────────┐
│ WestCord Strandhotel Seeduyn                                 │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Verblijf (3 nachten, 30 personen)              €4.500,00    │
│                                                               │
│ Extra's inbegrepen:                                          │
│ ├─ 🍽️ Lunch (30×)                               €675,00     │
│ ├─ 🍽️ 3-gangendiner (30×)                     €1.425,00     │
│ └─ 🚗 Parkeren Harlingen                        €150,00     │
│                                                               │
│ ──────────────────────────────────────────────────────────   │
│ Totaal                                         €6.750,00    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 Admin Overzicht

**Locatie:** Admin commissie-overzicht en request details

Extra's tonen bij logiesdetails zodat Bureau Vlieland ziet wat er verkocht is:
- Lijst van extra's met prijzen
- Totaal extra-omzet per offerte
- Commissie over totaalbedrag (inclusief extra's)

---

## 4. Technische Implementatie

### Nieuwe Bestanden

| Bestand | Doel |
|---------|------|
| `src/types/accommodationExtras.ts` | Type definities voor extra's |
| `src/components/partner-portal/AddQuoteExtraDialog.tsx` | Dialog voor extra toevoegen |
| `src/components/partner-portal/QuoteExtrasList.tsx` | Lijst component voor extra's |
| `src/hooks/useQuoteExtras.ts` | CRUD hooks voor extra's |

### Gewijzigde Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx` | Extra's sectie toevoegen |
| `src/components/accommodation-portal/AccommodationQuoteCard.tsx` | Extra's weergeven |
| `src/components/accommodation-portal/AccommodationQuoteDetailSheet.tsx` | Extra's detailweergave |
| `src/pages/admin/AdminAccommodationDetail.tsx` | Extra's tonen bij offerte details |
| `supabase/functions/get-admin-commissions/index.ts` | Extra's meenemen in commissie |

### Database Migratie

```sql
-- Nieuwe tabel voor quote extras
CREATE TABLE accommodation_quote_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES accommodation_quotes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'per_person' 
    CHECK (pricing_type IN ('per_person', 'fixed')),
  price_includes_vat BOOLEAN DEFAULT true,
  vat_rate DECIMAL(4,2) DEFAULT 9,
  category TEXT CHECK (category IN ('fb', 'facilities', 'transport', 'other')),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index voor snelle lookups
CREATE INDEX idx_quote_extras_quote_id ON accommodation_quote_extras(quote_id);

-- RLS
ALTER TABLE accommodation_quote_extras ENABLE ROW LEVEL SECURITY;

-- Partners kunnen extra's beheren via hun quotes
CREATE POLICY "Partners manage own quote extras" ON accommodation_quote_extras
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM accommodation_quotes q
      JOIN partners p ON p.id = q.partner_id
      WHERE q.id = quote_id
      AND p.auth_user_id = auth.uid()
    )
  );

-- Admin heeft volledige toegang
CREATE POLICY "Admin full access" ON accommodation_quote_extras
  FOR ALL USING (public.is_admin(auth.uid()));

-- Klanten kunnen extras lezen van submitted quotes
CREATE POLICY "Customers read submitted quote extras" ON accommodation_quote_extras
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accommodation_quotes q
      JOIN accommodation_requests r ON r.id = q.request_id
      WHERE q.id = quote_id
      AND q.status IN ('submitted', 'selected')
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_accommodation_quote_extras_updated_at
  BEFORE UPDATE ON accommodation_quote_extras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. Commissie Berekening

De commissie wordt berekend over het **totaalbedrag inclusief extra's**:

```
Totaal = Verblijfsprijs + Som(Extra's)
Commissie = Totaal × Commissiepercentage
```

Dit wordt automatisch meegenomen doordat:
1. Partner het totaalbedrag inclusief extra's invult in `price_total`
2. Of: het systeem berekent automatisch `price_total + SUM(extra totalen)`

Voorstel: **Optie 2** - Automatisch berekenen zodat de breakdown transparant blijft.

---

## 6. Workflow

### Partner Workflow

1. Partner ontvangt logiesaanvraag
2. Partner vult basis-offerte in (kamers, prijzen)
3. Partner voegt extra's toe (lunch, diner, parkeren)
4. Systeem berekent totaalprijs = basis + extra's
5. Partner dient offerte in

### Klant Workflow

1. Klant ziet offertes met totaalprijzen
2. Bij "Details" ziet klant de breakdown (basis + extra's)
3. Klant kiest offerte (inclusief alle extra's)

### Admin Workflow

1. Admin ziet in commissie-overzicht het totaal
2. Bij details ziet admin welke extra's verkocht zijn
3. Commissie wordt berekend over totaalbedrag

---

## 7. Fasering

### Fase 1 (Dit plan)
1. Database tabel aanmaken
2. Types en hooks voor extra's
3. Partner UI voor toevoegen/beheren extra's
4. Klant UI voor weergave extra's
5. Automatische totaalberekening

### Fase 2 (Later)
- Voorgedefinieerde extra's per partner (templates)
- Categorie-filtering in overzichten
- Rapportages: meest verkochte extra's
- Import/export functionaliteit

---

## 8. Resultaat

Na implementatie:
- Logiespartners kunnen F&B en andere diensten toevoegen aan hun offerte
- Extra's worden transparant weergegeven aan klanten
- Bureau Vlieland heeft volledig inzicht in verkochte extra's
- Commissie wordt correct berekend over het totaalbedrag
- Extra's worden niet getoond in de openbare configurator
