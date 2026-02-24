

# Fietshuur & Overtocht Doeksen: van "zelf regelen" naar Bureau Vlieland

## Wat verandert er?

Fietshuur en de overtocht met Rederij Doeksen worden niet langer als "zelf te regelen" gepresenteerd aan klanten. Bureau Vlieland regelt dit voortaan. Dit heeft impact op drie gebieden:

---

## 1. Database: building blocks updaten

De twee bouwstenen `fiets-huur` en `boot-retour` krijgen `block_type = 'bureau'` (dit staat al zo, maar we verwijderen ook de `external_url` zodat ze niet meer als extern worden gepresenteerd).

**SQL:**
```sql
UPDATE building_blocks 
SET external_url = NULL 
WHERE id IN ('fiets-huur', 'boot-retour');
```

## 2. Database: lopende projecten updaten

Er zijn **12 items** in actieve projecten die nog `block_type = 'self_arranged'` hebben voor fietshuur of de overtocht. Deze worden omgezet naar `bureau`:

**SQL:**
```sql
UPDATE program_request_items 
SET block_type = 'bureau', external_url = NULL
WHERE block_type = 'self_arranged'
  AND block_id IN ('fiets-huur', 'boot-retour')
  AND request_id IN (
    SELECT id FROM program_requests WHERE status = 'active'
  );
```

## 3. UI: externe-link banners verwijderen uit klantportaal

De `FietsverhuurBanner` en `BootticketBanner` in het klantportaal sturen klanten naar externe boekingssites. Nu Bureau Vlieland dit regelt, moeten deze banners weg uit het klantportaal.

### Bestanden die worden aangepast:

| Bestand | Wijziging |
|---|---|
| `src/components/customer-portal/ProgramSidebar.tsx` | Verwijder imports en rendering van `FietsverhuurBanner` en `BootticketBanner` |
| `src/components/customer-portal/ExtrasSection.tsx` | Verwijder `FietsverhuurBanner` en `BootticketBanner`, toon alleen de sectie als er in de toekomst andere extra's zijn (of verwijder component volledig) |

### Bestanden die NIET worden aangepast:

- `FietsverhuurBanner.tsx` en `BootticketBanner.tsx` blijven bestaan -- ze worden nog gebruikt op de publieke website (Footer, ExtraServices)
- `ExtraServices.tsx` (publieke diensten-pagina) -- blijft ongewijzigd
- `Footer.tsx` -- de fietsverhuur-link in de footer blijft staan (dit is een algemene service-link, geen klantportaal)

---

## Technische details

### Database migratie
Twee UPDATE-statements via de migratie-tool:
1. `building_blocks`: `external_url = NULL` voor `fiets-huur` en `boot-retour`
2. `program_request_items`: `block_type = 'bureau'` en `external_url = NULL` voor alle self_arranged items met die block_ids in actieve projecten

### ProgramSidebar.tsx (regels 3-4, 156-158)
- Verwijder de imports van `FietsverhuurBanner` en `BootticketBanner`
- Verwijder de twee banner-regels uit de sidebar

### ExtrasSection.tsx
- Verwijder de `FietsverhuurBanner` en `BootticketBanner` imports en rendering
- Omdat er geen overige extra's overblijven, wordt het component leeg. We laten het als een lege wrapper zodat het in de toekomst opnieuw gevuld kan worden, of verwijderen de rendering ervan

