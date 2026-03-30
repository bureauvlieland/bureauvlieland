

## Plan: Partner "Over ons" als eigen pagina + frontend-integratie

### Wijziging t.o.v. vorig plan
1. **Eigen pagina in sidebar** — niet verstopt in Instellingen, maar een apart menu-item "Mijn Profiel" (`/partner/profiel`) voor **alle** partners (activiteit, logies, beide)
2. **Frontend-gebruik** — plan bevat concrete stappen waar partnerprofieldata getoond wordt

### Deel 1: Nieuwe profielpagina in partnerportaal

**Nieuwe bestanden:**
- `src/pages/PartnerProfile.tsx` — pagina met "Over ons" formulier
- `src/components/partner-portal/PartnerProfileForm.tsx` — formuliercomponent met:
  - Bedrijfsbeschrijving (about_text)
  - Website URL
  - Kenmerken/USP's als tags
  - Locatiebeschrijving + coördinaten
  - Fotogalerij (PartnerImageUpload)

**Aanpassen:**
- `src/components/partner-portal/PartnerLayout.tsx` — menu-item **"Mijn Profiel"** toevoegen met `UserCircle` icoon, direct na "Overzicht", voor **alle** partner types (geen conditie)
- `src/App.tsx` — route `/partner/profiel` toevoegen
- `src/components/partner-portal/PartnerSettingsForm.tsx` — about_text/gallery/locatie/website/highlights velden + state **verwijderen** uit dit bestand (verhuist naar ProfileForm)

### Deel 2: Kamertype foto-upload

In `src/components/partner-portal/PartnerRoomTypeSheet.tsx`:
- PartnerImageUpload toevoegen voor foto's per kamertype (max 4)
- Opslag in bestaande `images` JSONB-kolom

### Deel 3: Frontend-weergave van partnerdata

| Locatie | Wat tonen |
|---|---|
| `src/components/configurator/BuildingBlockCard.tsx` | Partner foto (eerste gallery image als thumbnail), highlight_features als tags |
| `src/components/customer-portal/AccommodationSection.tsx` | Partner beschrijving, galerij, kenmerken bij geselecteerd logies |
| `src/components/customer-portal/CustomerProgramItem.tsx` | Partner foto naast activiteit-item |
| `src/components/admin/AdminAccommodationQuoteSheet.tsx` | Partner galerij + beschrijving bij offertebeoordeling |
| `src/components/admin/ForwardQuoteToCustomerDialog.tsx` | Partner foto's meesturen in klantofferte |

### Bestanden totaaloverzicht

| Bestand | Actie |
|---|---|
| `src/pages/PartnerProfile.tsx` | Nieuw |
| `src/components/partner-portal/PartnerProfileForm.tsx` | Nieuw |
| `src/components/partner-portal/PartnerLayout.tsx` | Menu-item toevoegen |
| `src/App.tsx` | Route toevoegen |
| `src/components/partner-portal/PartnerSettingsForm.tsx` | Profiel-velden verwijderen |
| `src/components/partner-portal/PartnerRoomTypeSheet.tsx` | Foto-upload toevoegen |
| `src/components/configurator/BuildingBlockCard.tsx` | Partner foto + tags |
| `src/components/customer-portal/AccommodationSection.tsx` | Partner profiel tonen |
| `src/components/customer-portal/CustomerProgramItem.tsx` | Partner foto |
| `src/components/admin/AdminAccommodationQuoteSheet.tsx` | Partner galerij |

