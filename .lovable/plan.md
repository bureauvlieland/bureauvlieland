
# Plan: Voorbeeldprogramma's / Arrangementen Systeem

## Samenvatting
Een template-systeem bouwen waarmee vooraf samengestelde programma's (1-daags, 2-daags, 3-daags) in één klik geladen kunnen worden in de configurator. Dit versnelt het offerte-proces voor klanten en maakt maatwerkvoorstellen door Bureau Vlieland eenvoudiger.

---

## 1. Voorgestelde Arrangementen

### 🏖️ Eilanddag Compleet (1 dag)
*Actief dagprogramma met lunch, activiteit en borrel*

| Tijd | Onderdeel | Block ID |
|------|-----------|----------|
| 10:00 | Overtocht Doeksen | `boot-retour` |
| 10:30 | Fietshuur | `fiets-huur` |
| 12:30 | Lunch in de natuur | `lunch-strand` |
| 14:00 | Beach Games | `beach-games` |
| 16:30 | Borrel & Hapjes | `borrel` |

---

### 🌅 Avontuur & Ontspanning (2 dagen)

**Dag 1:**
| Tijd | Onderdeel | Block ID |
|------|-----------|----------|
| 10:00 | RescueBoat Transfer | `rescueboat` |
| 10:30 | Fietshuur | `fiets-huur` |
| 12:30 | Luxe Lunchbuffet | `luxe-lunch` |
| 14:30 | Blokarten | `voc-blokarten` |
| 19:00 | Sunset Dinner | `sunset-dinner` |

**Dag 2:**
| Tijd | Onderdeel | Block ID |
|------|-----------|----------|
| 10:00 | Zeehondentocht | `zeehondentocht` |
| 12:30 | Lunch in de natuur | `lunch-strand` |
| 14:30 | SUP (Stand Up Paddle) | `voc-sup` |
| 16:00 | Borrel & Hapjes | `borrel` |
| 17:00 | Overtocht retour | `boot-retour` |

---

### 🏝️ Complete Eilandervaring (3 dagen)

**Dag 1:**
| Tijd | Onderdeel | Block ID |
|------|-----------|----------|
| 10:00 | RescueBoat Transfer | `rescueboat` |
| 10:30 | Fietshuur | `fiets-huur` |
| 12:30 | Luxe Lunchbuffet | `luxe-lunch` |
| 14:30 | Fietstocht met begeleiding | `fietstocht-met-begeleiding` |
| 19:00 | Sunset Dinner | `sunset-dinner` |

**Dag 2:**
| Tijd | Onderdeel | Block ID |
|------|-----------|----------|
| 10:00 | Vliehors Expres | `vliehors-expres` |
| 12:30 | Strand BBQ | `strand-bbq` |
| 14:30 | Beach Games | `beach-games` |
| 16:30 | Borrel & Hapjes | `borrel` |

**Dag 3:**
| Tijd | Onderdeel | Block ID |
|------|-----------|----------|
| 09:30 | Zeehondentocht | `zeehondentocht` |
| 12:00 | Lunch in de natuur | `lunch-strand` |
| 14:00 | Surfles | `surfen` |
| 16:30 | Borrel & Hapjes | `borrel` |
| 17:30 | Overtocht retour | `boot-retour` |

---

## 2. Technische Implementatie

### Database Schema

**Nieuwe tabel: `program_templates`**
```sql
CREATE TABLE program_templates (
  id TEXT PRIMARY KEY,           -- bijv. "eilanddag-compleet"
  name TEXT NOT NULL,            -- "Eilanddag Compleet"
  description TEXT,              -- Lange omschrijving
  short_description TEXT,        -- Korte tagline
  duration_days INTEGER NOT NULL, -- 1, 2 of 3
  target_group TEXT,             -- 'bedrijf', 'familie', 'algemeen'
  image_url TEXT,                -- Afbeelding voor preview
  indicative_price_pp DECIMAL,   -- Indicatieprijs p.p. (optioneel)
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Iedereen mag published templates lezen, admin mag alles
ALTER TABLE program_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published templates readable" ON program_templates
  FOR SELECT USING (is_published = true);
CREATE POLICY "Admin full access" ON program_templates
  FOR ALL USING (public.is_admin(auth.uid()));
```

**Nieuwe tabel: `program_template_items`**
```sql
CREATE TABLE program_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT REFERENCES program_templates(id) ON DELETE CASCADE,
  block_id TEXT REFERENCES building_blocks(id),
  day_index INTEGER NOT NULL DEFAULT 0,  -- 0 = dag 1, 1 = dag 2, etc.
  preferred_time TEXT,                    -- "10:00", "12:30", etc.
  notes TEXT,                             -- Optionele notitie
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE program_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Readable via template" ON program_template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM program_templates 
      WHERE id = template_id AND is_published = true
    )
  );
CREATE POLICY "Admin full access" ON program_template_items
  FOR ALL USING (public.is_admin(auth.uid()));
```

---

### Nieuwe Bestanden

**1. `src/types/programTemplate.ts`**
Type definities voor templates:
```typescript
export interface ProgramTemplate {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  duration_days: number;
  target_group: string | null;
  image_url: string | null;
  indicative_price_pp: number | null;
  is_published: boolean;
  sort_order: number;
  items?: ProgramTemplateItem[];
}

export interface ProgramTemplateItem {
  id: string;
  template_id: string;
  block_id: string;
  day_index: number;
  preferred_time: string | null;
  notes: string | null;
  sort_order: number;
  // Joined data
  block?: BuildingBlock;
}
```

**2. `src/hooks/useProgramTemplates.ts`**
React Query hooks:
- `usePublishedTemplates()` - Templates ophalen voor klanten
- `useTemplateWithItems(id)` - Enkele template met items ophalen
- (Later) Admin CRUD hooks

**3. `src/lib/templateLoader.ts`**
Helper om template in cart te laden:
```typescript
export const loadTemplateToCart = (
  template: ProgramTemplate,
  cartContext: CartContextType,
  startDate: Date
) => {
  // 1. Wis huidige cart
  cartContext.clearCart();
  
  // 2. Voeg datums toe (startDate + duration_days - 1)
  for (let i = 0; i < template.duration_days; i++) {
    const date = addDays(startDate, i);
    if (i === 0) {
      cartContext.setSelectedDate(date);
    } else {
      cartContext.addDate(date);
    }
  }
  
  // 3. Voeg alle items toe met correcte dag en tijd
  template.items?.forEach(item => {
    cartContext.addToCart(item.block_id, item.day_index);
    if (item.preferred_time) {
      cartContext.updateItem(item.block_id, {
        preferredTime: item.preferred_time,
        notes: item.notes || ""
      });
    }
  });
};
```

---

### UI Componenten

**4. `src/components/configurator/TemplateSelector.tsx`**
Modal/Sheet voor template selectie na stap 2 in de wizard:

```text
┌──────────────────────────────────────────────────────────────┐
│  Begin met een voorbeeldprogramma                            │
│  Of start met een leeg programma en stel zelf samen          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ [afbeelding]        │  │ [afbeelding]        │            │
│  │                     │  │                     │            │
│  │ Eilanddag Compleet  │  │ Avontuur &          │            │
│  │ 1 dag | ~€75 p.p.   │  │ Ontspanning         │            │
│  │                     │  │ 2 dagen | ~€195 p.p.│            │
│  │ Actief dagprogramma │  │                     │            │
│  │ met lunch, activit  │  │ Spectaculaire over- │            │
│  │ eit en borrel       │  │ steek, outdoor...   │            │
│  │                     │  │                     │            │
│  │ [Bekijk] [Gebruik]  │  │ [Bekijk] [Gebruik]  │            │
│  └─────────────────────┘  └─────────────────────┘            │
│                                                               │
│  ┌─────────────────────┐                                     │
│  │ [afbeelding]        │                                     │
│  │                     │                                     │
│  │ Complete Eiland-    │      ┌─────────────────────────┐   │
│  │ ervaring            │      │  ✨ Start leeg          │   │
│  │ 3 dagen | ~€345 p.p.│      │  Stel je eigen         │   │
│  │                     │      │  programma samen       │   │
│  │ Drie dagen vol...   │      └─────────────────────────┘   │
│  │                     │                                     │
│  │ [Bekijk] [Gebruik]  │                                     │
│  └─────────────────────┘                                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**5. `src/components/configurator/TemplatePreviewSheet.tsx`**
Sheet om template inhoud te bekijken voordat je kiest:
- Toont alle activiteiten per dag
- Tijdlijn-weergave
- Indicatieve prijs berekening
- "Gebruik dit programma" knop

---

### Integratie in ConfiguratorWizard

**Wijziging: `src/components/configurator/ConfiguratorWizard.tsx`**

Nieuwe optionele stap 2.5 (tussen datum en logies-vraag):
- Na stap 2 (datum/personen) toon TemplateSelector
- Gefilterd op `duration_days` die past bij geselecteerde dagen
- Gebruiker kan kiezen:
  - **Template gebruiken**: Laadt template in cart, ga naar programma-overzicht
  - **Start leeg**: Ga door naar logies-vraag (zoals nu)

---

### Seed Data

De 3 arrangementen worden als seed data ingevoerd bij de migratie:

```sql
-- Templates
INSERT INTO program_templates (id, name, short_description, description, duration_days, is_published, sort_order) VALUES
('eilanddag-compleet', 'Eilanddag Compleet', 'Actief dagprogramma met lunch, activiteit en borrel', 'Een complete dag Vlieland met overtocht, fietsen, lunch op een spectaculaire locatie, strandactiviteiten en afsluiting met borrel.', 1, true, 1),
('avontuur-ontspanning', 'Avontuur & Ontspanning', 'Twee dagen actie en genieten', 'Spectaculaire RescueBoat overtocht, outdoor activiteiten, zeehondentocht en culinaire verwennerij.', 2, true, 2),
('complete-eilandervaring', 'Complete Eilandervaring', 'Drie dagen vol avontuur', 'Het ultieme Vlieland programma: alle hoogtepunten in drie dagen.', 3, true, 3);

-- Template items (per template)
INSERT INTO program_template_items (template_id, block_id, day_index, preferred_time, sort_order) VALUES
-- Eilanddag Compleet
('eilanddag-compleet', 'boot-retour', 0, '10:00', 1),
('eilanddag-compleet', 'fiets-huur', 0, '10:30', 2),
('eilanddag-compleet', 'lunch-strand', 0, '12:30', 3),
('eilanddag-compleet', 'beach-games', 0, '14:00', 4),
('eilanddag-compleet', 'borrel', 0, '16:30', 5),
-- ... etc voor andere templates
```

---

## 3. Fasering

### Fase 1 (Dit plan)
1. ✅ Database tabellen aanmaken met RLS
2. ✅ 3 templates als seed data invoeren
3. ✅ Types en hooks voor templates
4. ✅ Template loader utility
5. ✅ TemplateSelector component
6. ✅ TemplatePreviewSheet component
7. ✅ Integreren in ConfiguratorWizard

### Fase 2 (Later)
- Admin interface voor template beheer
- Templates aanmaken/bewerken met drag-and-drop
- Meer templates toevoegen (rustig alternatief, familieweekend, etc.)
- Templates koppelen aan landingspagina's

---

## 4. Wijzigingen Bestaande Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/contexts/CartContext.tsx` | `loadFromTemplate()` functie toevoegen |
| `src/components/configurator/ConfiguratorWizard.tsx` | Template-keuze stap toevoegen |
| `src/integrations/supabase/types.ts` | Automatisch bijgewerkt na migratie |

---

## 5. Resultaat

Na implementatie:
- ✅ Klanten kunnen bij start kiezen uit 3 voorbeeldprogramma's
- ✅ Met één klik wordt het complete programma geladen in de configurator
- ✅ Klanten kunnen daarna nog aanpassen wat ze willen
- ✅ Templates worden gefilterd op aantal geselecteerde dagen
- ✅ Bureau Vlieland kan later via admin templates beheren
- ✅ Indicatieve prijzen worden getoond
