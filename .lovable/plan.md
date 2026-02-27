
Doel: dit definitief oplossen zodat klantcontactgegevens nooit meer zichtbaar zijn bij `bureau_central`, ook niet bij impersonatie of onvolledige data in de UI.

1) Probleem exact afkaderen (op basis van huidige data en screenshot)
- De screenshot komt uit `PartnerAccommodationQuoteSheet` (sectie “Wat nu?”).
- In de database staat voor dit concrete dossier (`Richard Melvin Dijkstra`) `invoicing_mode = bureau_central`.
- Conclusie: de bug zit niet in de brondata, maar in de aanlevering/doorvoer naar de sheet (mode ontbreekt of is `null` op render-moment), waardoor de UI nu terugvalt naar “direct klantcontact”.

2) Privacy-first fail-safe invoeren in de UI (belangrijkste structurele fix)
- In `PartnerAccommodationQuoteSheet` de logica omdraaien van “toon klant tenzij bureau_central” naar:
  - toon klantcontact alléén als mode expliciet `partner_direct` is;
  - bij `bureau_central` én bij `unknown/null` nooit klantcontact tonen.
- Voor de “Wat nu?”-tekst drie paden maken:
  - `bureau_central`: alleen Bureau Vlieland-instructies;
  - `partner_direct`: directe klantinstructies;
  - `unknown`: neutrale veilige melding (“facturatiemodus wordt geladen / neem contact op met Bureau Vlieland”), zonder e-mail/telefoon van klant.
- Hiermee voorkomen we dat PII ooit uitlekt door timing, ontbrekende velden of regressies.

3) Dataketting robuust maken in dashboard-flow
- In `src/pages/PartnerDashboard.tsx` bij `handleSelectQuote` en selectie-state expliciet controleren dat `linked_program_id` en `invoicing_mode` worden meegenomen (bestaat al deels, maar ik maak dit defensief en consistent).
- In `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx` de mode-resolutie uitbreiden met fallback-volgorde:
  1. `request.invoicingMode` uit parent state;
  2. `billingDetails.invoicing_mode` uit gekoppeld programma;
  3. fallback lookup via `accommodation_request_id` → `linked_program_id` → `program_requests.invoicing_mode` (ook bruikbaar als `linked_program_id` initieel niet in state zat).
- Resultaat: ook als één bron ontbreekt, wordt mode alsnog bepaald; en tot die tijd blijft UI veilig afgeschermd.

4) Backend-aanlevering hard maken voor partnerdashboard
- In `supabase/functions/get-partner-dashboard/index.ts` de mapping voor accommodatiequotes uitbreiden zodat `invoicing_mode` altijd betrouwbaar gezet wordt als dat afleidbaar is.
- Als `linked_program_id` ontbreekt of mapping faalt: expliciet `invoicing_mode: null` zetten (geen impliciete fallback naar direct), zodat frontend veilige “unknown”-route pakt.
- Redactie van `customer_email` en `customer_phone` voor `bureau_central` blijft server-side gehandhaafd (defense in depth).

5) Oude/parallelle partner-logiesflow gelijk trekken
- `src/pages/PartnerAccommodation.tsx` gebruikt dezelfde sheet en eigen datastroom; daar dezelfde defensieve mode-resolutie toepassen zodat gedrag identiek is op beide routes.
- `src/components/partner-portal/PartnerAccommodationTable.tsx` klant-email alleen tonen bij expliciet `partner_direct`; anders bedrijfsnaam/naam zonder contactdetail.
- Hiermee voorkom je dat het op dashboard wel goed is maar op logies-tab nog lekt.

6) Validatieplan (gericht op jouw concrete case)
- Testcase A (impersonatie): `/partner/dashboard?impersonate=het-vlielandhotel` openen, geselecteerde RMD-offerte openen:
  - verwacht: geen klant-email/telefoon;
  - verwacht: “Factureer aan Bureau Vlieland”-instructie zichtbaar.
- Testcase B (echte partner login): hetzelfde dossier openen:
  - verwacht exact hetzelfde resultaat als A.
- Testcase C (partner_direct dossier):
  - verwacht: klantcontact en directe factuurinstructie wel zichtbaar.
- Testcase D (tijdelijke missing mode simuleren):
  - verwacht: géén klantcontact; neutrale veilige melding.
- Extra: hard refresh op productie-URL na release om cache-effect uit te sluiten.

Technische notities
- Geen schemawijziging nodig; dit is primair frontend + backend function hardening.
- Ik houd alle wijzigingen beperkt tot bestaande patronen/onderdelen zodat regressierisico laag blijft.
- Kernprincipe na fix: “alleen tonen bij expliciete toestemming van datamodel” i.p.v. “verbergen bij speciale uitzondering”.
