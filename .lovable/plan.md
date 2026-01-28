

# Plan: Terminologie-verbeteringen en Partner Portal Uitbreidingen

## Analyse Bevindingen

### 1. Terminologie-inconsistenties

**Status Labels (Partner vs Klant)**

| Status | Partner Portal | Klant Portal | Voorstel |
|--------|---------------|--------------|----------|
| pending | "Nieuw" | "Aangevraagd" | Beide correct voor eigen perspectief |
| confirmed | "Bevestigd" | "Bevestigd" | Consistent |
| accepted | "Klantakkoord" | - | OK |
| executed | "Uitgevoerd" | - | OK |
| alternative | "Wacht op klant" | "Alternatief" | Partner: "Alternatief voorgesteld" |
| invoiced | "Gefactureerd" | - | OK |

**Probleem:** De status `alternative` wordt in de Partner Portal weergegeven als "Wacht op klant", maar vanuit partnerperspectief is "Alternatief voorgesteld" duidelijker.

**Dashboard Tab Namen (Partner Portal)**

Huidige tabs: Nieuw / Wacht op klant / Akkoord / Afgerond

Voorstel voor consistentie:
- "Nieuw" (pending) - OK
- "Voorstel verstuurd" (confirmed + alternative) - duidelijker dan "Wacht op klant"
- "Akkoord" (accepted + executed) - OK  
- "Afgerond" (invoiced + cancelled + unavailable) - OK

---

### 2. Bug in Partner Facturatie

**Locatie:** `src/pages/PartnerFinance.tsx` regel 132

```typescript
// HUIDIG (FOUT):
const toBeInvoicedItems = data.items.filter(
  (i) => i.status === "confirmed" && !i.invoiced_number
);

// CORRECT:
const toBeInvoicedItems = data.items.filter(
  (i) => i.status === "executed" && 
         !i.invoiced_number && 
         i.program_requests.terms_accepted_at !== null
);
```

**Impact:** Partners zien items als "nog te factureren" voordat de klant akkoord is gegaan.

---

### 3. Partner Type Labels

**Huidige labels:**
- `activity_provider` → "Activiteiten"
- `accommodation` → "Logies"  
- `both` → "Beide"

**Voorstel:** Consistenter en duidelijker:
- `activity_provider` → "Activiteiten"
- `accommodation` → "Logies"
- `both` → "Activiteiten & Logies"

---

### 4. Ontbrekende Partner Portal Functies

**A. Dashboard Uitbreiding**
- YTD omzet (Year-to-Date revenue)
- Openstaande commissies prominenter
- Snelle navigatie naar actie-items

**B. Instellingen Pagina**
Momenteel beperkt tot basisgegevens. Toevoegen:
- Bankgegevens voor commissie-uitbetalingen
- Contactpersoon voor boekingen
- Openingstijden/beschikbaarheid
- Factuurgegevens (standaard teksten)

**C. Notificatie-overzicht**
Partners zien nu niet wanneer klanten hun voorstellen accepteren. Toevoegen:
- "Klant heeft akkoord gegeven" badge
- Tijdlijn van belangrijke events per item

---

## Implementatie Stappen

### Fase 1: Terminologie Fixes (Prioriteit Hoog)

1. **Fix status label voor 'alternative'**
   - Bestand: `src/components/partner-portal/PartnerItemSheet.tsx`
   - Wijzig: `alternative: { label: "Wacht op klant" }` naar `alternative: { label: "Alternatief voorgesteld" }`

2. **Fix Partner Finance filter bug**
   - Bestand: `src/pages/PartnerFinance.tsx`
   - Corrigeer filter voor "Nog te factureren" items

3. **Update Partner Dashboard tabs**
   - Bestand: `src/pages/PartnerDashboard.tsx`
   - "Wacht op klant" → "Voorstel verstuurd"

4. **Partner type label update**
   - Bestand: `src/pages/admin/AdminPartners.tsx`
   - Update `PARTNER_TYPE_LABELS` object

### Fase 2: Partner Portal Verbeteringen (Prioriteit Medium)

5. **Uitgebreidere Instellingen pagina**
   - Bestand: `src/components/partner-portal/PartnerSettingsForm.tsx`
   - Toevoegen: Bankgegevens sectie
   - Toevoegen: Contactpersoon velden
   - Toevoegen: Beschikbaarheid notities

6. **Dashboard Header verbetering**
   - Bestand: `src/components/partner-portal/PartnerDashboardHeader.tsx`
   - Toevoegen: YTD omzet kaart
   - Toevoegen: Commissie-status indicator

7. **Item Sheet klant-acceptatie indicator**
   - Bestand: `src/components/partner-portal/PartnerItemSheet.tsx`
   - Badge tonen wanneer `customer_accepted_at` is gevuld

### Fase 3: Admin Verbeteringen (Prioriteit Laag)

8. **Better cross-linking in Admin**
   - Links tussen gerelateerde entiteiten versterken
   - Partner detail → Gerelateerde aanvragen
   - Aanvraag detail → Partner overzicht

---

## Technische Details

### Database Impact
Geen schema wijzigingen nodig - alle velden bestaan al.

### Bestanden die worden aangepast

```text
src/components/partner-portal/PartnerItemSheet.tsx
src/pages/PartnerFinance.tsx
src/pages/PartnerDashboard.tsx
src/pages/admin/AdminPartners.tsx
src/components/partner-portal/PartnerSettingsForm.tsx
src/components/partner-portal/PartnerDashboardHeader.tsx
```

### Nieuwe database velden (optioneel voor Fase 2)
Partners tabel uitbreiden met:
- `bank_iban` (text, nullable)
- `bank_account_name` (text, nullable)
- `booking_contact_name` (text, nullable)
- `booking_contact_phone` (text, nullable)
- `availability_notes` (text, nullable)

---

## Samenvatting Prioriteiten

| Prioriteit | Item | Reden |
|------------|------|-------|
| Hoog | Fix Finance filter bug | Functioneel probleem |
| Hoog | Fix 'alternative' label | UX verwarring |
| Medium | Tab naam update | Consistentie |
| Medium | Instellingen uitbreiding | Partner gemak |
| Medium | Dashboard YTD omzet | Inzicht |
| Laag | Cross-linking admin | Nice-to-have |

