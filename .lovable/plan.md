
# Plan: Unieke Identifiers + Gebundeld Klantprojecten Overzicht

## Status: ✅ Volledig Geïmplementeerd

---

## Wat is geïmplementeerd

### Fase 1: Database Migratie ✅
- `reference_number` kolommen toegevoegd aan `program_requests`, `accommodation_requests`, en `partners`
- Database functies voor auto-generatie:
  - `generate_program_reference_number()` → BV-YYMM-NNNN
  - `generate_accommodation_reference_number()` → LOG-YYMM-NNNN
  - `generate_partner_reference_number()` → P-NNN
- Triggers voor automatisch toekennen bij INSERT
- Bestaande records hebben referentienummers gekregen

### Fase 2: Admin Projecten Overzicht ✅
- Nieuwe pagina `/admin/projecten` (AdminProjects.tsx)
- **Unified Project View** die drie types combineert:
  - `program_only`: Alleen activiteiten (groen)
  - `accommodation_only`: Alleen logies (amber)
  - `combined`: Logies + Activiteiten (indigo)
- Query haalt zowel `program_requests` als standalone `accommodation_requests` op
- Standalone logies (zonder gekoppelde activiteiten) worden nu correct getoond
- Statistieken per projecttype
- Zoeken op referentienummer (BV-XXXX of LOG-XXXX), naam, bedrijf
- Filter op projecttype en status
- Links naar detail pagina's en klantportaal

### Fase 3: UI Updates ✅
- Referentienummer kolom in AdminRequests.tsx
- Referentienummer kolom in AdminAccommodation.tsx
- Referentienummer prominent in AdminRequestDetail.tsx header
- Referentienummer prominent in AdminAccommodationDetail.tsx header
- Navigatie: "Projecten" toegevoegd aan admin sidebar
- Type-indicator badges (Logies/Activiteiten/Beide)
- Beide referentienummers zichtbaar per project waar van toepassing

### Fase 4: Partner Portal Bundeling
- Nog niet geïmplementeerd (low priority)

---

## Referentienummer Formats

| Entiteit | Format | Voorbeeld |
|----------|--------|-----------|
| Programma aanvragen | `BV-JJMM-NNNN` | `BV-2601-0001` |
| Logies aanvragen | `LOG-JJMM-NNNN` | `LOG-2601-0001` |
| Partners | `P-NNN` | `P-001` |
| Bouwstenen | Bestaande slugs | `zeehondentocht` |

---

## Project Type Definitie

Een "project" in `/admin/projecten` is nu:
1. Een `program_request` (met of zonder gekoppelde accommodation), OF
2. Een standalone `accommodation_request` (niet gekoppeld aan een program_request)

Dit zorgt ervoor dat alle klantaanvragen zichtbaar zijn in één centraal overzicht.

---

## Bestanden aangepast

### Nieuwe bestanden
- `src/pages/admin/AdminProjects.tsx`

### Aangepaste bestanden
- `src/components/admin/AdminLayout.tsx` - Projecten nav item
- `src/App.tsx` - Route toegevoegd
- `src/pages/admin/AdminRequests.tsx` - Reference column
- `src/pages/admin/AdminAccommodation.tsx` - Reference column
- `src/pages/admin/AdminRequestDetail.tsx` - Reference in header
- `src/pages/admin/AdminAccommodationDetail.tsx` - Reference in header

### Database
- Migratie uitgevoerd voor reference_number kolommen en triggers
