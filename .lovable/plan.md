

## Plan: Uniforme workflow — alle projecten als offerteaanvraag

### Kern van de wijziging

Elk project doorloopt dezelfde pipeline, ongeacht of het door de klant of admin is aangemaakt. `program_type` blijft bestaan om de **herkomst** te traceren ("self_service" vs "maatwerk_zakelijk" etc.), maar de **workflow** wordt volledig gestuurd door `quote_status`. Hierdoor verdwijnt alle vertakkende logica en krijgen admin, klant en partner een uniforme ervaring.

### Nieuwe uniforme pipeline

```text
Klant dient aan ──┐
                  ├──▶ concept ──▶ offerte_verstuurd ──▶ akkoord_ontvangen ──▶ AV getekend ──▶ Afgerond
Admin maakt aan ──┘
```

De admin reviewt en past altijd aan voordat het naar de klant gaat. Statuswijzigingen, akkoorden en publicatie werken identiek.

### Wijzigingen per bestand

**1. Klant-aanmaak: `quote_status: "concept"` meegeven**
- `src/components/configurator/CheckoutContactForm.tsx` — voeg `quote_status: "concept"` toe aan insert
- `src/components/configurator/RequestFormModal.tsx` — idem

**2. `isQuoteOrMaatwerk` verwijderen / vereenvoudigen**
- `src/lib/quoteItemSendStatus.ts` — `isQuoteOrMaatwerk()` functie wordt vervangen. Alle projecten met `quote_status` volgen nu de quote-flow. Aangezien álle projecten `quote_status` krijgen, kan de check versimpeld worden naar: "heeft het project een `quote_status`?" (altijd true). De `getQuoteItemSendPhase` functie verwijdert de `isQuote` gate — elk item met `skip_partner_notification` en zonder `customer_approved_at` is "wacht_op_klant" als de offerte verstuurd is.

**3. Admin project detail — geen speciale self-service paden meer**
- `src/pages/admin/AdminRequestDetail.tsx`:
  - `isQuoteMode` wordt altijd `true` → variabele kan weg, alle quote-specifieke UI (offertestatus-selector, item quote status kolom, "Verstuur offerte" knop) toont altijd
  - Concept-banner (regel 1078): verwijder `request.program_type !== "self_service"` check — banner toont nu voor álle niet-gepubliceerde projecten
  - Quote status badge en selector: altijd zichtbaar

**4. Admin projectenlijst — pipeline vereenvoudigen**
- `src/pages/admin/AdminProjects.tsx`:
  - `getDerivedStatus`: verwijder de `isQuote` check en `!isQuote` fallback. Alle projecten volgen: cancelled → fully_invoiced → av_getekend → offerte_verstuurd → concept
  - Verwijder de `actief` status uit `DerivedStatus` en `DERIVED_STATUS_CONFIG` (wordt nu afgedekt door bestaande quote-statussen)

**5. Klantportaal — uniforme weergave**
- `src/components/customer-portal/ProgramIntroCard.tsx`: `isQuoteMode` altijd true → vereenvoudig naar directe checks op `quoteStatus`
- `src/components/customer-portal/CustomerProgramItem.tsx`: `isQuoteMode` prop wordt altijd true → verwijder de `!isQuoteMode` paden (akkoord/tegenvoorstel knoppen voor niet-quote items)
- `src/components/customer-portal/DesktopProgramView.tsx` en `MobileProgramView.tsx`: `isQuoteMode` berekening vereenvoudigen
- `src/components/customer-portal/CustomerPortalSplash.tsx`: verwijder self-service-specifieke banners

**6. Edge function — self-service uitzondering verwijderen**
- `supabase/functions/accept-quote-proposal/index.ts`: verwijder de `isSelfService` check (regel 344). Alle projecten krijgen `quote_status = "akkoord_ontvangen"` bij klantakkoord.

**7. PipelineFunnel — `actief` fase verwijderen**
- `src/components/admin/PipelineFunnel.tsx`: verwijder "Actief" als aparte categorie. Alle projecten vallen in de bestaande quote-statussen.

### Wat er NIET verandert
- `program_type` veld blijft bestaan — het trackt de herkomst (wie heeft het aangemaakt)
- De `ProgramType` TypeScript type blijft
- Bestaande data: self-service projecten zonder `quote_status` worden in de UI behandeld als `concept` (fallback)
- Partner-notificatie flow: items worden nog steeds aangemaakt met `skip_partner_notification: true` en handmatig vrijgegeven

### Bestanden (17 wijzigingen)
1. `src/components/configurator/CheckoutContactForm.tsx`
2. `src/components/configurator/RequestFormModal.tsx`
3. `src/lib/quoteItemSendStatus.ts`
4. `src/pages/admin/AdminRequestDetail.tsx`
5. `src/pages/admin/AdminProjects.tsx`
6. `src/components/admin/PipelineFunnel.tsx`
7. `src/components/customer-portal/ProgramIntroCard.tsx`
8. `src/components/customer-portal/CustomerProgramItem.tsx`
9. `src/components/customer-portal/DesktopProgramView.tsx`
10. `src/components/customer-portal/MobileProgramView.tsx`
11. `src/components/customer-portal/CustomerPortalSplash.tsx`
12. `src/components/admin/FinancialOverviewCard.tsx`
13. `supabase/functions/accept-quote-proposal/index.ts`
14. Database migratie — backfill bestaande self-service projecten: `UPDATE program_requests SET quote_status = 'concept' WHERE program_type = 'self_service' AND quote_status IS NULL`

