

# Audit Rapport: Discrepanties, Onvolledigheden en Verbeterpunten

## Kritieke Issues (direct fixen)

### 1. `select-accommodation-quote`: stuurt nog steeds automatisch klantmail
**Ernst: HOOG**

Het eerdere plan was om automatische klantmailings te verwijderen, maar `select-accommodation-quote/index.ts` stuurt nog steeds:
- **Regel 276-322**: Automatische bevestigingsmail naar de klant ("Bedankt voor uw keuze!")
- **Regel 220-274**: E-mail naar de partner met volledige klantgegevens (email, telefoon) — ongeacht `invoicing_mode`

Dit is in strijd met het principe "logies gaat altijd via Bureau Vlieland". De klant mag zelf selecteren (dat is gewenst), maar de resulterende e-mails moeten respecteren dat Bureau Vlieland de intermediair is.

**Fix:**
- Verwijder de automatische klantbevestigingsmail (regels 276-322)
- In de partnermail: check `invoicing_mode` van het linked program. Bij `bureau_central` klantgegevens maskeren
- Maak een admin-todo aan zodat Bureau Vlieland handmatig de bevestiging doet

---

### 2. `select-accommodation-quote`: negeert `invoicing_mode` bij klantgegevens in partnermail
**Ernst: HOOG**

Regel 226-234: De partnermail bevat altijd klant-email en telefoon, ook als `invoicing_mode = bureau_central`. Dit schendt het privacy-first principe dat in de memory staat gedocumenteerd.

**Fix:** Haal `invoicing_mode` op via het linked program en maskeer klantgegevens bij `bureau_central`.

---

### 3. `ContactAccommodationDialog`: werkt alleen voor `selected` quotes, maar UI toont knop voor `submitted` quotes
**Ernst: MEDIUM**

In `AccommodationQuoteItem.tsx` (regel 114-122) wordt een "Contact" knop getoond voor alle quotes die vanuit `AccommodationSection.tsx` een `onContact` callback krijgen. Maar de edge function `send-customer-accommodation-message` (regel 82-83) filtert op `status = 'selected'` — dus berichten voor `submitted` quotes falen altijd met "Offerte niet gevonden".

**Fix:** Verbreed de filter in de edge function naar `IN ('submitted', 'selected')`, of verberg de Contact-knop voor niet-geselecteerde quotes.

---

### 4. `AdminAccommodationDetail.tsx`: ontbreekt facturatiemodel (`InvoicingModeSelector`)
**Ernst: MEDIUM**

De `InvoicingModeSelector` wordt wél gebruikt op `AdminRequestDetail.tsx` (programma detail), maar **niet** op `AdminAccommodationDetail.tsx` (logies detail). Er is geen indicatie wie moet factureren (Bureau Vlieland of partner). Het linked program wordt opgehaald maar het `invoicing_mode` veld wordt niet getoond.

**Fix:** Voeg een read-only weergave van het facturatiemodel toe in de sidebar van `AdminAccommodationDetail.tsx`, opgehaald uit het linked program.

---

### 5. Admin selectie van logiesofferte: geen partner-notificatie en geen afwijzingsmails
**Ernst: MEDIUM**

`AdminAccommodationDetail.tsx` regel 281-296: De admin `selectQuoteMutation` doet alleen directe database-updates. Er worden geen partner-notificaties gestuurd, geen afwijzingsmails naar afgewezen partners, en geen commissie berekend. De klant-selectieflow (`select-accommodation-quote` edge function) doet dit wél allemaal.

**Fix:** Maak een admin-variant of hergebruik de edge function met een `admin_override` vlag (zoals bij `accept-quote-proposal`).

---

## Middelmatige Issues

### 6. `usePartnerDashboard.ts`: dubbele fetch-aanroep
**Ernst: LAAG**

Regel 27-35: Eerst wordt `supabase.functions.invoke("get-partner-dashboard")` aangeroepen (zonder token), daarna wordt dezelfde functie opnieuw aangeroepen via `fetch()` met het token als query param. De eerste aanroep is nutteloos.

**Fix:** Verwijder de eerste, overtollige `supabase.functions.invoke()` aanroep.

---

### 7. Hardcoded portal URL in edge functions
**Ernst: LAAG**

Meerdere edge functions (`send-accommodation-request`, `notify-accommodation-quote`) hebben hardcoded `https://bureauvlieland.nl/...` voor portal URLs. Bij test/preview omgevingen wordt de verkeerde URL verstuurd in emails.

**Locaties:**
- `send-accommodation-request/index.ts` regel 87, 191-193
- `notify-accommodation-quote/index.ts` gebruikt `getPortalBaseUrl()` correct, maar de fallback in `send-accommodation-request` is hardcoded

**Fix:** Gebruik overal `getPortalBaseUrl(origin)` en stuur de `origin` header consistent mee.

---

### 8. `AccommodationStatusBanner` wordt niet gebruikt in klantportaal
**Ernst: LAAG**

De component `AccommodationStatusBanner` wordt alleen gebruikt op de legacy `AccommodationQuotes.tsx` pagina (die redirected naar het klantportaal). In het klantportaal zelf (`AccommodationSection.tsx`) wordt de status inline getoond. Er is duplicatie van status-logica.

**Fix:** Optioneel — consolideer de statusweergave. Geen directe bug, maar verwarrend voor onderhoud.

---

### 9. Quote extras commissie: `commission_percentage` default is 15% in DB maar 10% in app_settings
**Ernst: MEDIUM**

`accommodation_quote_extras` tabel heeft `commission_percentage DEFAULT 15`, maar `app_settings.default_accommodation_commission` staat op 10%. Partners column `accommodation_commission_percentage` heeft ook DEFAULT 10. Dit kan leiden tot verkeerde commissieberekeningen voor extra's.

**Fix:** Migratie om de default op `accommodation_quote_extras.commission_percentage` te wijzigen naar 10.

---

### 10. Ontbrekende email-log bij partnermail in `select-accommodation-quote`
**Ernst: LAAG**

De partnernotificatie-email (regel 252-273) wordt niet gelogd in `email_log`. De klantmail en afwijzingsmails worden wél gelogd. Dit maakt het onmogelijk om in het admin dashboard te zien of de partner de "uw offerte is geaccepteerd" mail heeft ontvangen.

**Fix:** Voeg `logEmail()` aanroep toe na de partnermail in `select-accommodation-quote`.

---

### 11. `create_program_for_accommodation` trigger: hardcoded `status: 'active'`
**Ernst: LAAG**

De database trigger die automatisch een program aanmaakt bij een nieuwe logiesaanvraag zet het programma direct op `status: 'active'`. Dit is correct voor het klantportaal, maar het programma wordt aangemaakt zonder items en zonder dat de admin hiervan op de hoogte is (geen todo).

**Aanbeveling:** Overweeg een auto-todo "Nieuw programma vanuit logiesaanvraag" aan te maken.

---

## Overzicht per bestand

| Bestand | Issue # | Ernst |
|---|---|---|
| `select-accommodation-quote/index.ts` | 1, 2, 10 | HOOG |
| `AccommodationQuoteItem.tsx` / `send-customer-accommodation-message/index.ts` | 3 | MEDIUM |
| `AdminAccommodationDetail.tsx` | 4, 5 | MEDIUM |
| `usePartnerDashboard.ts` | 6 | LAAG |
| `send-accommodation-request/index.ts` | 7 | LAAG |
| `accommodation_quote_extras` (DB) | 9 | MEDIUM |

## Aanbevolen implementatievolgorde

1. **Issues 1 + 2**: Verwijder klantmail uit `select-accommodation-quote`, respecteer `invoicing_mode` in partnermail
2. **Issue 5**: Admin selectie-flow uitbreiden met notificaties en commissie
3. **Issue 4**: Facturatiemodel tonen op logies-detailpagina
4. **Issue 3**: Contact-knop fixen voor submitted quotes
5. **Issue 9**: Commissie default corrigeren in DB
6. **Issue 10**: Email-logging toevoegen
7. **Issues 6, 7, 8, 11**: Cleanup-taken

