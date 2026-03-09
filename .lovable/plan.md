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
