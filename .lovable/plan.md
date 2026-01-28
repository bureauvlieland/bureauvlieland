# Plan: Terminologie-verbeteringen en Partner Portal Uitbreidingen

## ✅ Status: Geïmplementeerd

---

## Implementatie Overzicht

### Fase 1: Terminologie Fixes ✅

1. **✅ Fix status label voor 'alternative'**
   - `PartnerItemSheet.tsx`: "Wacht op klant" → "Alternatief voorgesteld"

2. **✅ Fix Partner Finance filter bug**
   - `PartnerFinance.tsx`: Filter nu correct op `status === "executed"` + `terms_accepted_at !== null`

3. **✅ Update Partner Dashboard tabs**
   - `PartnerDashboard.tsx`: "Wacht op klant" → "Voorstel verstuurd"
   - Tab bevat nu ook `alternative` items naast `confirmed`

4. **✅ Partner type label update**
   - `AdminPartners.tsx`: "Beide" → "Activiteiten & Logies"

### Fase 2: Partner Portal Verbeteringen ✅

5. **✅ Uitgebreidere Instellingen pagina**
   - `PartnerSettingsForm.tsx` uitgebreid met:
     - Bankgegevens sectie (IBAN, tenaamstelling)
     - Contactpersoon boekingen (naam, telefoon)
     - Beschikbaarheid notities

6. **✅ Dashboard Header verbetering**
   - `PartnerDashboardHeader.tsx` uitgebreid met:
     - YTD omzet kaart (prominent weergegeven)
     - Openstaande commissie indicator
     - Label "Wacht op klant" → "Voorstel verstuurd" in stats

7. **✅ Item Sheet klant-acceptatie indicator**
   - `PartnerItemSheet.tsx`: Badge "Klant akkoord" wanneer `customer_accepted_at` is gevuld

### Database Migratie ✅

Nieuwe velden toegevoegd aan `partners` tabel:
- `bank_iban` (text, nullable)
- `bank_account_name` (text, nullable)
- `booking_contact_name` (text, nullable)
- `booking_contact_phone` (text, nullable)
- `availability_notes` (text, nullable)

---

## Bestanden Aangepast

```text
src/components/partner-portal/PartnerItemSheet.tsx
src/pages/PartnerFinance.tsx
src/pages/PartnerDashboard.tsx
src/pages/admin/AdminPartners.tsx
src/components/partner-portal/PartnerSettingsForm.tsx
src/components/partner-portal/PartnerDashboardHeader.tsx
```
