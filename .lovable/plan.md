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
