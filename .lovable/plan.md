## Bevindingen

Grondige sweep is klaar. Goede nieuws: alle 106 edge functions worden nog gebruikt (na de recente `notify-*-price-change` opschoning was er niets vergelijkbaars meer). De rest is vooral **oude versies die bewust zijn vervangen** door nieuwere componenten — geen "per ongeluk losgekoppelde" features die gereanimeerd moeten worden. Twee twijfelgevallen leg ik voor.

Onderverdeeld in vier categorieën.

### A. Config-vervuiling (klein, veilig, hoge signaal-waarde)

Deze staan in de config maar de code bestaat niet meer → verwarrend voor toekomstige debugging.

1. `supabase/config.toml` regels 14/16/169 — entries voor `quote-chat`, `send-wedding-inquiry`, `ensure-smoke-test-fixture` waarvan de bijbehorende `supabase/functions/<naam>/` map niet bestaat. **Weghalen.**
2. `src/lib/edgeFunctionTestCoverage.ts:91` — registry-entry `"mailjet-tracking"` bestaat niet als functie (hernoemd naar `mailjet-event-webhook`, regel 87). **Weghalen** — nu vervuilt hij het `/admin/email-health`-overzicht met een permanente "ontbrekend"-waarschuwing.

### B. Dode admin-pagina + dode import

3. `src/pages/admin/AdminPartners.tsx` — pagina is verwijderd uit de router (`App.tsx:259` heeft expliciet comment "AdminPartners removed — /admin/partners redirects to /admin/crm?tab=partners"), maar de `lazy()`-import op `App.tsx:87` staat er nog. **Import weghalen + pagina-bestand verwijderen** (redirect blijft werken via de bestaande `<Navigate>` op regel 246).

### C. Oude configurator / partner-portal / customer-portal componenten (24 stuks)

Deze zijn aantoonbaar bewust vervangen door nieuwere bestanden:

- Meerdere bestanden bevatten expliciete "removed / not rendered anymore"-comments (`ExtrasSection.tsx:2`, `ProgramSidebar.tsx:1`).
- Voor elk oud bestand bestaat een nieuwer, wél-gebruikt vervangend bestand (bv. `AiErwinChat` → `AiErwinDialog`; oude `ConfiguratorWizard` → `ProgramBuilderView` + `BasicsForm` + `CheckoutStepIndicator`; oude partner-dashboard-tegels → nieuwe `PartnerDashboard`).
- 0 importers, geen `React.lazy`, geen dynamische string-lookup.

**Voorstel: in bulk verwijderen (één commit, makkelijk terug te draaien als het toch stuk gaat).**

Componenten (allen in `src/components/`):

- `BootticketBanner.tsx`, `FietsverhuurBanner.tsx`, `ExtraServices.tsx`, `FerryScheduleCard.tsx`
- `admin/InvoicingModeSelector.tsx`, `admin/NextStepBanner.tsx`, `admin/WorkOverview.tsx`
- `catering/CateringWizard.tsx`
- `configurator/AddToCartDialog.tsx`, `AiErwinChat.tsx`, `BuildingBlockCard.tsx`, `BuildingBlockListItem.tsx`, `ConfiguratorCart.tsx`, `ConfiguratorWizard.tsx`, `RequestFormModal.tsx`, `SupportCTA.tsx`, `ViewToggle.tsx`
- `customer-portal/AcceptProposalCard.tsx`, `AcceptQuoteProposalCard.tsx`, `ExtrasSection.tsx`, `NextStepsCard.tsx`, `StatusSummary.tsx`
- `map/MapBookingDialog.tsx`
- `partner-portal/ConfirmCommissionCard.tsx`, `PartnerAccommodationTable.tsx`, `PartnerActionBanner.tsx`, `PartnerChangesSinceBanner.tsx`, `PartnerCompactStats.tsx`, `PartnerDashboardHeader.tsx`, `PartnerFinancialSummary.tsx`, `PartnerItemCard.tsx`, `PartnerItemRow.tsx`, `PartnerProjectsList.tsx`, `PartnerShowcaseSection.tsx`, `PartnerStatsGrid.tsx`, `PartnerUnifiedList.tsx`, `PartnerUpcomingActivities.tsx`, `StatusUpdateDialog.tsx`

Werkwijze: per bestand `rg` op de exportnaam om zeker te zijn dat geen laatste importer over het hoofd is gezien (subagent heeft dit al gedaan, maar we bevestigen tijdens uitvoer per file), dan `rm`.

### D. Dode media-assets (11 stuks)

Geen enkele referentie in `src/**`:

- `src/assets/ferry-doeksen.jpg`
- `src/assets/hero-vlieland-editorial.jpg`
- `src/assets/lexence-1.jpg` t/m `lexence-6.jpg` (6 bestanden — oude versie vóór de `lexence/` submap)
- `src/assets/programmas/regina-andrea-hero.jpg`, `regina-andrea.jpg`

**Weghalen.** Bespaart repo-grootte en voorkomt "welke van deze is nu de juiste?"-verwarring.

### Bewust NIET aanpakken

- **DB trigger-functies**: 32 SQL-functies leken op grep "ongebruikt" maar bleken allemaal via `CREATE TRIGGER` gekoppeld. Geen actie, wel gedocumenteerd voor toekomstige sweeps.
- `**src/assets/lexence/*.asset.json**`: Lovable-platform-metadata die buiten reguliere imports gebruikt kan worden. Niet aanraken zonder bevestiging (zie open vraag).
- **Volledige `ts-prune`/`knip`-scan** op losse utility-exports in `src/lib/**`: buiten scope van deze sweep — nu geen bewijs dat het dood is, wél buiten bereik van grep-gebaseerd onderzoek. Kan als aparte follow-up.

### Twee vragen vooraf

1. `**src/pages/admin/AdminPlanning.tsx**` — dit is een aparte planning-pagina die nergens aan een route hangt. Naast `WeekPlanningView.tsx` die wél gebruikt wordt (geïntegreerd in `/admin/projecten`). Twee opties:
  - **Weg**: als `WeekPlanningView` functioneel gelijkwaardig is en dit gewoon een oude versie is.
  - **Reanimeren**: als de bedoeling ooit was een aparte planning-URL te hebben (bv. `/admin/planning`) naast de projecten-view.
   Weet je uit je hoofd of je zelf ooit een aparte planning-pagina hebt gebouwd? Zo nee → weg.
2. `**src/assets/lexence-*.jpg` (los in `src/assets/`)** vs. de map `src/assets/lexence/` met `.asset.json`'s. De losse jpgs worden nergens geïmporteerd. Mag ik ervan uitgaan dat de map-versie de canonieke is en de losse bestanden weg mogen?

Zeg "beide weg" (of geef aan wat je wél wilt bewaren) en ik voer A t/m D uit.

Beide weg