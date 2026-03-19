## Plan: Operationeel Commandocentrum

### Status: ✅ Geïmplementeerd

### Wat is gebouwd

1. **Sidebar herstructurering**: "Taken" verplaatst naar "Operationeel" sectie (met badge), E-maillog en Activiteitenlog verwijderd uit sidebar (nu tabs onder Taken). "Systeem" bevat alleen nog "Instellingen".

2. **Tabbed Operationeel Centrum** (`AdminTodos.tsx`): Drie tabs — Taken, E-maillog, Activiteitenlog — alles op één pagina.

3. **Deep links & snelacties**: Per `auto_type` een contextknop (bijv. "Bekijk aanvraag", "Bekijk partner") die direct naar de juiste detail-pagina navigeert. Partner- en request-links zijn nu deep links naar `/admin/partners/{id}` en `/admin/aanvragen/{id}`.

4. **Groepering per auto_type**: Taken gegroepeerd in collapsible secties per type, handmatige taken apart.

5. **Bulk-acties**: Meerdere taken selecteren en tegelijk afvinken.

6. **Snooze-functionaliteit**: `snoozed_until` kolom op `admin_todos`. Snooze-dialog met presets (morgen, 3 dagen, 7 dagen). Gesnoozede taken verborgen in actief-weergave.

7. **Badge in sidebar**: Realtime telling van openstaande taken (excl. gesnoozede) in het sidebar-menu-item "Taken".

8. **Auto-resolve in edge functions**:
   - `update-partner-item-status`: resolve `partner_reminder` (was al aanwezig)
   - `select-accommodation-quote`: resolve `quote_pending_customer`
   - `accept-quote-proposal`: resolve `terms_reminder`
   - `notify-accommodation-quote`: resolve `quote_pending_partner`

---

## Plan: CRM en Partners samenvoegen

### Status: ✅ Geïmplementeerd

CRM is nu het gecombineerde overzicht met tabs Klanten en Partners. Partners-tab bevat het volledige partneroverzicht met onboarding stats, bulk invite, unavailability, filters. Redirect van `/admin/partners` naar `/admin/crm?tab=partners`.

---

## Plan: Projecten verwijderen, Logies in navigatie, Communicatie-privacy

### Status: ✅ Geïmplementeerd

1. **Projecten verwijderen**: Soft-delete (status → `deleted`) met bevestigingsdialog. Optie om gekoppelde logiesaanvraag mee te verwijderen of los te koppelen. Verwijderde projecten worden uitgefilterd in het overzicht.

2. **Logies in sidebar**: `/admin/logies` toegevoegd aan de Operationeel sectie in de sidebar navigatie. Per logiesaanvraag wordt het facturatietype getoond: Maatwerk (bureau_central), Direct (partner_direct), of Zelfstandig (geen gekoppeld project).

3. **Communicatie-privacy bij bureau_central**: Edge function `send-customer-accommodation-message` checkt nu `invoicing_mode`. Bij `bureau_central` worden klant-PII (email, telefoon) verborgen, Reply-To gaat naar `hallo@bureauvlieland.nl`, en Bureau Vlieland fungeert als tussenpersoon. Klantportaal toont bij `bureau_central` uitleg dat communicatie via Bureau Vlieland verloopt.

---

## Plan: Aanvraagflow herstructureren — Admin-first & Bureau Centraal

### Status: ✅ Geïmplementeerd

### Wat is gewijzigd

1. **Partner-e-mails verwijderd uit `send-program-request`**: Bij indiening ontvangt alleen Bureau Vlieland en de klant een e-mail. Partners worden niet meer automatisch benaderd.

2. **Klant-e-mail tekst aangepast**: "Aanbieders zullen contact opnemen" → "Bureau Vlieland beoordeelt uw aanvraag en neemt contact op".

3. **Database default gewijzigd**: `invoicing_mode` default is nu `bureau_central`. Alle bestaande `partner_direct` records zijn geconverteerd.

4. **`approve-quote-item` geblokkeerd voor klanten**: Zonder `admin_override` flag wordt de actie geweigerd (403). Alleen admins kunnen items naar partners versturen.

5. **Admin "Verstuur naar partners"**: De bestaande bulk-actie via `accept-quote-proposal` met `admin_override` blijft intact voor handmatig doorsturen.

6. **InvoicingModeSelector verwijderd**: Vervangen door read-only informatiekaart "Bureau Vlieland factureert de klant". PurchaseInvoicesCard wordt altijd getoond.

7. **`partner_direct` branches verwijderd** uit:
   - `CustomerPortalSplash.tsx` — facturatieteksten altijd bureau_central
   - `PartnerAccommodationQuoteSheet.tsx` — altijd "Factureer aan Bureau Vlieland"
   - `PartnerAccommodationTable.tsx` — klant-e-mail niet meer getoond
   - Edge functions: fallback defaults naar `bureau_central`
   - `InvoicingMode` type vereenvoudigd

8. **Bureau e-mail bijgewerkt**: Partner-items sectie zegt nu "handmatig via admin" i.p.v. "automatisch verstuurd".

---

## Plan: Bureau Vlieland als centrale regie — Volledige alignment

### Status: ✅ Geïmplementeerd

### Wat is gewijzigd

#### A. Kritieke flow-fixes
1. **`skip_partner_notification: true`** toegevoegd aan `CheckoutContactForm.tsx` en `RequestFormModal.tsx` — items worden nu gestaged voor admin review.
2. **"Verstuur naar partners" banner** werkt nu voor alle programmatypes (niet meer beperkt tot quote-modus).
3. **`accept-quote-proposal`** slaat `quote_status` update over voor `self_service` programma's; zet altijd `program_published_at` als die null is.
4. **Admin banner tekst** gecorrigeerd: "De klant ziet het programma als 'In behandeling'". Publiceer-banner beperkt tot admin-aangemaakte programma's.

#### B. `partner_direct` relikten verwijderd
5. **`InvoicingModeSelector.tsx`** omgezet naar read-only "Bureau Vlieland factureert de klant".
6. **`CustomerProgram.tsx`** fallback gewijzigd naar `"bureau_central"`.
7. **`ContactAccommodationDialog.tsx`** — altijd bureau_central teksten, geen directe partner-communicatie branches.
8. **`PriceSummaryCard.tsx`** — partner_direct secties verwijderd.
9. **`InvoiceProvidersCard.tsx`** — individuele partner-listings uitgeschakeld, altijd bureau-facturatie.
10. **`select-accommodation-quote`** — PII altijd verborgen voor partners.

#### C. Klantportaal teksten
11. **`ProgramIntroCard.tsx`** — "Bureau Vlieland coördineert de aanvragen bij de aanbieders."
12. **`ActionRequiredCard.tsx`** — billing: "zodat Bureau Vlieland kan factureren"; complete: "U ontvangt de factuur van Bureau Vlieland."
13. **`NextStepsCard.tsx`** — "U ontvangt de factuur van Bureau Vlieland."

#### D. Publieke pagina's & juridisch
14. **`LogiesVlieland.tsx`** en **`LogiesAanvragen.tsx`** — stap 4: "Bureau Vlieland begeleidt het boekingsproces".
15. **`PartnerTerms.tsx`** — Artikel 1 en 5 aangepast: facturatie altijd via Bureau Vlieland.

#### E. Statuslabels
16. **`CustomerProgramItem.tsx`** — readOnly + pending → "In behandeling"; isPreApproval + pending → "In voorbereiding".

#### F. Data
17. Bestaande self_service items met `skip_partner_notification = false` en `program_published_at IS NULL` geüpdatet naar `true`.
## Plan: MijnActiviteitenPlanner (MAP) Integratie

### Status: ✅ Geïmplementeerd

### Wat is gebouwd

1. **Database**: `map_tenant_slug` kolom op `partners` tabel + `map_bookings` tabel met RLS (alleen admins).

2. **Edge Function `map-proxy`**: Centrale proxy voor MAP API v1 calls. Routeert via `X-Api-Key`, ondersteunt activities, activitytypes, en detail endpoints.

3. **Edge Function `map-create-booking`**: Boekt activiteiten via MAP API, slaat boeking op in `map_bookings` met 10% commissie-berekening.

4. **Admin Partner Detail**: `map_tenant_slug` veld toegevoegd aan partner formulier voor MAP-koppeling.

5. **Publieke pagina `/activiteiten-boeken`**: Kalender + zoek/filter, activiteitenkaarten met live data, directe boekflow met boekingsdialog, prijzen +10% commissie markup.

6. **Componenten**: `MapActivityCard` (kaart met badge "Direct boekbaar"), `MapBookingDialog` (boekingsformulier met prijsberekening).

7. **Admin Dashboard**: `MapBookingsWidget` met recente boekingen en commissie-tracking.

8. **Hook `useMapActivities`**: Fetcht MAP data voor individuele partner of alle gekoppelde partners.
