
# Plan: Unieke Identifiers + Gebundeld Klantprojecten Overzicht

## Analyse Huidige Situatie

### Identifier Structuur
| Entiteit | Huidige ID | Voorbeeld |
|----------|-----------|-----------|
| program_requests | UUID | `ad6c5b4d-b680-4c4e-a0c4-071648abcaa8` |
| accommodation_requests | UUID | `b2dc384a-7161-4692-8375-f41a0d2ff765` |
| partners | text (slug) | `vliehors-expres` |
| building_blocks | text (slug) | `zeehondentocht` |

**Probleem:** UUID's zijn niet leesbaar voor admins/klanten in communicatie.

### Datastructuur Koppelingen
```text
program_requests.linked_accommodation_id → accommodation_requests.id
```
De data is al gekoppeld, maar de UI toont ze gescheiden.

---

## Deel 1: Leesbare Referentienummers

### Voorgestelde Nummerformaten
| Entiteit | Format | Voorbeeld |
|----------|--------|-----------|
| Klantopdrachten (programma) | `BV-JJMM-NNNN` | `BV-2601-0001` |
| Logies aanvragen | `LOG-JJMM-NNNN` | `LOG-2601-0001` |
| Partners | `P-NNN` | `P-001` |
| Bouwstenen | Bestaande slugs behouden | `zeehondentocht` |

### Database Wijzigingen
Nieuwe kolommen toevoegen:
- `program_requests.reference_number` (text, unique)
- `accommodation_requests.reference_number` (text, unique)
- `partners.reference_number` (text, unique)

Auto-generatie via database trigger bij INSERT.

---

## Deel 2: Gebundeld Klantprojecten Overzicht

### Concept: "Klantprojecten"
Een klantopdracht/project bundelt:
- **Logies** (optioneel, via accommodation_requests)
- **Activiteiten** (via program_requests + items)

### UI Wijzigingen - Admin Portal

**Nieuwe pagina: `/admin/projecten`**
Eén overzicht dat klantprojecten toont met:
- Klantnaam + referentienummer
- Logies status (indien aanwezig)
- Activiteiten status samenvatting
- Totaalwaarde programma
- Laatste update datum

**Bestaande pagina's:**
- `/admin/aanvragen` → Blijft bestaan voor gedetailleerd activiteiten-beheer
- `/admin/logies` → Blijft bestaan voor gedetailleerd logies-beheer
- `/admin/projecten` → Nieuw: Gebundeld overzicht

### UI Wijzigingen - Partner Portal

**Uitbreiding PartnerDashboard:**
Voor partners met `partner_type: 'both'`:
- Items groeperen per klantproject in plaats van los
- Toon logies + activiteiten samen per klant

---

## Implementatie Stappen

### Fase 1: Database Migratie
1. Voeg `reference_number` kolommen toe aan relevante tabellen
2. Maak database functie voor auto-generatie nummers
3. Maak triggers voor automatisch toekennen bij INSERT
4. Genereer nummers voor bestaande records

### Fase 2: Admin Projecten Overzicht
1. Maak nieuwe pagina `AdminProjects.tsx`
2. Query die program_requests + accommodation_requests combineert
3. Toon klanten met hun complete project (logies + activiteiten)
4. Filter/zoek op referentienummer, klantnaam, status

### Fase 3: UI Updates
1. Toon referentienummer in alle relevante schermen
2. Update AdminRequestDetail om referentienummer prominent te tonen
3. Update AdminAccommodationDetail idem
4. Update email templates om referentienummer te includeren

### Fase 4: Partner Portal Bundeling (optioneel)
1. Groepeer items per klantproject in PartnerDashboard
2. Toon samenhangende view van logies + activiteiten per klant

---

## Technische Details

### Database Trigger voor Referentienummers
```sql
-- Functie om volgend nummer te genereren
CREATE OR REPLACE FUNCTION generate_reference_number(prefix text)
RETURNS text AS $$
DECLARE
  year_month text;
  next_seq int;
  ref_num text;
BEGIN
  year_month := to_char(now(), 'YYMM');
  -- Haal hoogste nummer op voor dit prefix + jaar/maand
  SELECT COALESCE(MAX(...), 0) + 1 INTO next_seq ...
  ref_num := prefix || '-' || year_month || '-' || lpad(next_seq::text, 4, '0');
  RETURN ref_num;
END;
$$ LANGUAGE plpgsql;
```

### Gecombineerde Query voor Projecten Overzicht
```sql
SELECT 
  pr.id,
  pr.reference_number,
  pr.customer_name,
  pr.customer_company,
  pr.selected_dates,
  pr.number_of_people,
  pr.status as program_status,
  ar.id as accommodation_id,
  ar.reference_number as accommodation_ref,
  ar.status as accommodation_status,
  ar.arrival_date,
  ar.departure_date,
  (SELECT count(*) FROM program_request_items WHERE request_id = pr.id) as item_count
FROM program_requests pr
LEFT JOIN accommodation_requests ar ON pr.linked_accommodation_id = ar.id
ORDER BY pr.created_at DESC
```

---

## Bestanden die worden aangepast

### Nieuwe bestanden
- `src/pages/admin/AdminProjects.tsx` - Projecten overzicht
- Database migratie voor referentienummers

### Bestaande bestanden
- `src/pages/admin/AdminRequestDetail.tsx` - Toon referentienummer
- `src/pages/admin/AdminAccommodationDetail.tsx` - Toon referentienummer
- `src/pages/admin/AdminRequests.tsx` - Toon referentienummer kolom
- `src/pages/admin/AdminAccommodation.tsx` - Toon referentienummer kolom
- `src/components/admin/AdminLayout.tsx` - Nieuwe nav item "Projecten"
- `src/App.tsx` - Route toevoegen
- Email templates - Referentienummer variabelen

---

## Samenvatting

| Onderdeel | Prioriteit | Impact |
|-----------|------------|--------|
| Referentienummers database | Hoog | Verbetert communicatie admin ↔ klant |
| Projecten overzicht admin | Hoog | Vermindert versplintering |
| Referentienummers in UI | Medium | Consistentie |
| Partner bundeling | Laag | Nice-to-have |

Dit plan zorgt ervoor dat:
1. Elke aanvraag een leesbaar nummer krijgt voor communicatie
2. Admins één overzicht hebben waar logies + activiteiten samenkomen
3. De bestaande detail-pagina's intact blijven voor diep beheer
