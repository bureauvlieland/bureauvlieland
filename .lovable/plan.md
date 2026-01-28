
# Plan: Uniforme Klant-URL Architectuur

## Probleem

Momenteel hebben logies-aanvragen en programma-aanvragen elk hun eigen `customer_token` en aparte URL:
- Programma's: `/mijn-programma/:token`
- Logies-only: `/mijn-logies/:token`

Als later activiteiten worden toegevoegd aan een logies-only project, zou de klant ofwel een nieuwe URL krijgen, ofwel handmatig gekoppeld moeten worden. Dit is ongewenst.

---

## Oplossing: Automatisch Program Request aanmaken

Bij elke nieuwe logies-aanvraag wordt automatisch ook een lege `program_request` aangemaakt. Hierdoor:

1. **Eén URL voor alles**: Elk project is altijd benaderbaar via `/mijn-programma/:token`
2. **Naadloze groei**: Activiteiten kunnen later worden toegevoegd zonder URL-wijziging
3. **Consistente admin-ervaring**: Alle projecten zijn "combined" of "program_only"

---

## Technische Wijzigingen

### Fase 1: Database Trigger

Een database trigger die automatisch een `program_request` aanmaakt wanneer een `accommodation_request` wordt ingevoegd:

```sql
CREATE OR REPLACE FUNCTION create_program_for_accommodation()
RETURNS trigger AS $$
BEGIN
  -- Maak automatisch een gekoppeld program_request aan
  INSERT INTO program_requests (
    customer_token,
    customer_name,
    customer_email,
    customer_phone,
    customer_company,
    number_of_people,
    selected_dates,
    linked_accommodation_id,
    status
  ) VALUES (
    encode(gen_random_bytes(12), 'hex'),
    NEW.customer_name,
    NEW.customer_email,
    NEW.customer_phone,
    NEW.customer_company,
    NEW.number_of_guests,
    jsonb_build_array(NEW.arrival_date::text, NEW.departure_date::text),
    NEW.id,
    'active'
  )
  RETURNING id INTO NEW.linked_program_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_program_for_accommodation
  BEFORE INSERT ON accommodation_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_program_for_accommodation();
```

### Fase 2: Edge Functions Aanpassen

**send-accommodation-request/index.ts**
- Bevestigingsmail nu altijd verwijzen naar `/mijn-programma/:program_token`
- Het program token ophalen via de nieuwe `linked_program_id` relatie

**notify-accommodation-quote/index.ts**
- Idem: altijd `/mijn-programma/:token` gebruiken

### Fase 3: Admin Projecten Pagina

**AdminProjects.tsx**
- Verwijder de logica voor "accommodation_only" type 
- Alle projecten zijn nu "program_only" of "combined"
- De "Bekijk als klant" knop gaat altijd naar `/mijn-programma/:token`

### Fase 4: /mijn-logies Route Redirect

**AccommodationQuotes.tsx**
- Redirect oude `/mijn-logies/:token` URLs naar de nieuwe uniforme URL
- Zoek het programma op via `linked_program_id` en redirect

```typescript
// Als iemand een oude /mijn-logies link gebruikt:
// 1. Zoek het accommodation_request op token
// 2. Haal linked_program_id op
// 3. Haal program_request.customer_token op
// 4. Redirect naar /mijn-programma/:program_token
```

### Fase 5: Migratie Bestaande Data

SQL migratie om bestaande "standalone" accommodation requests te koppelen:

```sql
-- Voor elke accommodation_request zonder linked_program_id:
-- Maak een program_request aan en koppel deze
INSERT INTO program_requests (
  customer_token,
  customer_name,
  ...
  linked_accommodation_id
)
SELECT 
  encode(gen_random_bytes(12), 'hex'),
  customer_name,
  ...
  id
FROM accommodation_requests
WHERE linked_program_id IS NULL;
```

---

## Data Flow na Implementatie

```text
┌─────────────────────────────────────────────────────────────────┐
│                    KLANT START LOGIES WIZARD                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Insert in accommodation_requests                             │
│ 2. Database trigger maakt automatisch program_request          │
│ 3. Bidirectionele koppeling via foreign keys                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Bevestigingsmail met link:                                      │
│ https://bureauvlieland.nl/mijn-programma/{program_token}       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Klant bezoekt /mijn-programma/:token                            │
│ - Ziet logies sectie met offertes                               │
│ - Kan activiteiten toevoegen                                    │
│ - Kan billing details invullen                                  │
│ - Alles op één plek                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backwards Compatibility

| Scenario | Gedrag |
|----------|--------|
| Nieuwe logies aanvraag | Automatisch program_request aangemaakt |
| Bestaande `/mijn-logies/:token` link | Redirect naar `/mijn-programma/:program_token` |
| Admin bekijkt oud logies-only project | Na migratie: normaal als combined project |

---

## Samenvatting Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/migrations/xxx.sql` | Trigger + migratie bestaande data |
| `supabase/functions/send-accommodation-request/index.ts` | Gebruik program token in emails |
| `supabase/functions/notify-accommodation-quote/index.ts` | Idem |
| `src/pages/AccommodationQuotes.tsx` | Redirect naar /mijn-programma |
| `src/pages/admin/AdminProjects.tsx` | Verwijder accommodation_only logica |

---

## Voordelen

1. **Eén URL per klant**: Geen verwarring, geen dubbele links
2. **Naadloze uitbreiding**: Activiteiten toevoegen wijzigt niets aan de URL
3. **Eenvoudiger admin**: Alle projecten werken hetzelfde
4. **Betere klantervaring**: Alles op één overzichtelijke plek
5. **Toekomstbestendig**: Nieuwe features hoeven maar één flow te ondersteunen
