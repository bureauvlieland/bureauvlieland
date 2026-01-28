
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
- Gecombineerde view van logies + activiteiten per klant
- Statistieken: totaal, met logies, actief, voorwaarden akkoord
- Zoeken op referentienummer, naam, bedrijf
- Links naar detail pagina's en klantportaal

### Fase 3: UI Updates ✅
- Referentienummer kolom in AdminRequests.tsx
- Referentienummer kolom in AdminAccommodation.tsx
- Referentienummer prominent in AdminRequestDetail.tsx header
- Referentienummer prominent in AdminAccommodationDetail.tsx header
- Navigatie: "Projecten" toegevoegd aan admin sidebar

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
