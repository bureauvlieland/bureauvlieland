

# Volledige Review: Bureau Vlieland als centrale regie

Na grondige analyse van de codebase zijn er 14 issues gevonden — variërend van onjuiste teksten tot ontbrekende logica en dode code.

---

## Gevonden Issues

### A. Kritieke flow-problemen

**A1. Items worden ZONDER `skip_partner_notification: true` aangemaakt bij klant-submit**
Zowel `CheckoutContactForm.tsx` (r117) als `RequestFormModal.tsx` (r175) maken items aan zonder `skip_partner_notification: true`. Hierdoor kan de admin ze niet "versturen naar partners" via `accept-quote-proposal`, want die filtert op `skip_partner_notification === true`.

**A2. "Verstuur naar partners" banner alleen bij quote-modus**
`AdminRequestDetail.tsx` (r903) toont de banner alleen als `isQuoteMode && quote_status === "akkoord_ontvangen"`. Self-service programma's hebben geen quote-modus, dus de admin kan nooit naar partners versturen.

**A3. `accept-quote-proposal` zet altijd `quote_status: "akkoord_ontvangen"`**
Bij self-service programma's (geen offerte) overschrijft dit onterecht de quote_status. De functie moet `program_published_at` ook zetten bij admin_override.

**A4. Admin banner tekst onjuist**
`AdminRequestDetail.tsx` (r943): "De klant ziet een placeholder" — klant ziet nu het programma read-only.

### B. Invoicing mode relikten (`partner_direct`)

**B1. `InvoicingModeSelector.tsx` bestaat nog volledig**
RadioGroup met `partner_direct` optie. Volgens het plan is dit verwijderd/vervangen door read-only info, maar het bestand bestaat nog.

**B2. Fallback `partner_direct` in `CustomerProgram.tsx`**
Regel 299: `invoicing_mode || "partner_direct"` — moet `"bureau_central"` zijn.

**B3. `ContactAccommodationDialog.tsx` toont `partner_direct` branches**
Regels 98-101, 115-122: Teksten voor directe klant-partner communicatie ("Zij zullen rechtstreeks per e-mail reageren") worden nog getoond als `isBureauCentral` false is.

**B4. `PriceSummaryCard.tsx` toont partner-facturen apart**
Regels 234-240, 427-428: "Partner invoices section - only in partner_direct mode" — dode code die nooit zou moeten tonen, maar de conditionele check `!isBureauCentral` kan triggeren bij fallback.

**B5. `InvoiceProvidersCard.tsx` toont partner-items individueel**
Regel 100-101 en 214-215: Tekst "afzonderlijke facturen van de onderstaande partijen" en individuele partner-listings.

**B6. `select-accommodation-quote` edge function bevat PII-branch**
Regel 276-278: "Only include customer PII if partner_direct" — impliceert dat klant-PII soms naar partners gaat.

### C. Tekst-inconsistenties in klantportaal

**C1. ProgramIntroCard na publicatie (r215-217)**
"Wij hebben de aanvragen verstuurd naar de aanbieders. U kunt in de tussentijd onderdelen wijzigen, verwijderen of toevoegen." — Klant mag geen wijzigingen doen. Tekst moet aangepast.

**C2. ActionRequiredCard billing beschrijving (r152)**
"zodat de aanbieders u kunnen factureren" — Bureau Vlieland factureert, niet de aanbieders.

**C3. ActionRequiredCard complete beschrijving (r182)**
"U ontvangt de facturen van de verschillende aanbieders" — idem, Bureau Vlieland factureert.

**C4. NextStepsCard complete (r143)**
"U ontvangt de facturen van de verschillende aanbieders" — zelfde tekst.

### D. Publieke pagina's

**D1. LogiesVlieland.tsx en LogiesAanvragen.tsx stap 4**
"Boek direct / boek rechtstreeks bij de accommodatie" — Bureau Vlieland regelt dit.

**D2. PartnerTerms.tsx Artikel 1 en 5**
"De overeenkomst komt rechtstreeks tot stand tussen Partner en Eindklant" en "factureert de Partner rechtstreeks aan de Eindklant" — verwijzen naar partner_direct model.

### E. Overig

**E1. `CustomerProgramItem.tsx` statuslabel logica (r121)**
`(isPreApproval || invoicingMode === "bureau_central") && item.status === "pending"` toont "In voorbereiding" voor alle bureau_central items. Zou alleen vóór publicatie "In behandeling" moeten tonen, en na publicatie "Aangevraagd".

---

## Wijzigingsplan

| # | Bestand | Actie |
|---|---------|-------|
| A1 | `CheckoutContactForm.tsx` | `skip_partner_notification: true` toevoegen aan itemsToInsert |
| A1 | `RequestFormModal.tsx` | Idem |
| A2 | `AdminRequestDetail.tsx` r903 | Banner conditie wijzigen: `pendingPartnerItems.length > 0` (zonder quote-mode check) |
| A3 | `accept-quote-proposal/index.ts` | Bij `isAdmin`: skip `quote_status` update voor `self_service` programma's; altijd `program_published_at` zetten als die null is |
| A4 | `AdminRequestDetail.tsx` r943 | Tekst: "De klant ziet het programma als 'In behandeling'" |
| B1 | `InvoicingModeSelector.tsx` | Verwijderen of omzetten naar read-only "Bureau Vlieland factureert" |
| B2 | `CustomerProgram.tsx` r299 | Fallback `"bureau_central"` |
| B3 | `ContactAccommodationDialog.tsx` | Verwijder `partner_direct` branches, altijd bureau_central gedrag |
| B4 | `PriceSummaryCard.tsx` | Verwijder `!isBureauCentral` secties |
| B5 | `InvoiceProvidersCard.tsx` | Verwijder individuele partner-listings, altijd bureau-facturatie tonen |
| B6 | `select-accommodation-quote/index.ts` | Altijd PII verbergen voor partners |
| C1 | `ProgramIntroCard.tsx` r215-217 | Tekst: "Bureau Vlieland coördineert de aanvragen bij de aanbieders. U ontvangt bericht zodra er reacties zijn." |
| C2 | `ActionRequiredCard.tsx` r152 | "zodat Bureau Vlieland kan factureren" |
| C3 | `ActionRequiredCard.tsx` r182 | "U ontvangt de factuur van Bureau Vlieland" |
| C4 | `NextStepsCard.tsx` r143 | Idem |
| D1 | `LogiesVlieland.tsx` + `LogiesAanvragen.tsx` | Stap 4: "Bureau Vlieland begeleidt het boekingsproces" |
| D2 | `PartnerTerms.tsx` | Artikelen aanpassen: facturatie altijd via Bureau Vlieland |
| E1 | `CustomerProgramItem.tsx` r121 | Label logica: readOnly → "In behandeling", published+pending → "Aangevraagd", rest ongewijzigd |
| DB | Migratie | Bestaande self_service items met `skip_partner_notification = false` en `program_published_at IS NULL` → update naar `true` |

### Samenvatting impact
- **6 bestanden** met `partner_direct` relikten opschonen
- **4 klantportaal teksten** corrigeren naar bureau_central realiteit
- **2 publieke pagina's** + **1 juridische pagina** aanpassen
- **2 checkout forms** + **1 edge function** + **1 admin pagina** voor correcte flow
- **1 database migratie** voor bestaande data

