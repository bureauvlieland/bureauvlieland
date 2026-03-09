

## Operationeel Commandocentrum — Todo's, Logs en Mails samenvoegen

### Huidige situatie

Er zijn nu 4 losse plekken met overlappende informatie:

```text
Dashboard (LiveActivityFeed)     → realtime feed van klant/partner/admin acties
Todo's (/admin/todos)            → takenlijst, alleen afvinken/bewerken/verwijderen
E-maillog (/admin/berichten)     → alle verzonden mails
Activiteitenlog (/admin/logs)    → admin_activity_log tabel
```

De todo-pagina mist actionable knoppen, deep links, en auto-resolve. De logs en mails staan apart zonder context.

### Wat we gaan bouwen

**1. Todo-pagina upgraden naar Operationeel Commandocentrum**

De todo-pagina wordt het centrale werkscherm. Verplaatsen van "Systeem" naar "Operationeel" in de sidebar (onder Dashboard).

Drie tabs op de pagina:
- **Taken** (huidige todo's, maar verbeterd)
- **E-maillog** (inhoud van huidige AdminMessages, inline)
- **Activiteitenlog** (inhoud van huidige AdminLogs, inline)

**2. Todo-lijst verrijken met deep links en snelacties**

Per `auto_type` komen contextgebonden knoppen:

| auto_type | Deep link | Snelactie |
|---|---|---|
| partner_reminder | `/admin/aanvragen/{request_id}` | "Bekijk aanvraag" |
| quote_review | `/admin/logies/{request_id}` | "Bekijk offerte" |
| quote_pending_partner | `/admin/partners/{partner_id}` | "Bekijk partner" |
| quote_pending_customer | `/admin/aanvragen/{request_id}` | "Bekijk project" |
| commission_pending | `/admin/commissies` | "Bekijk commissies" |
| terms_reminder | `/admin/aanvragen/{request_id}` | "Bekijk project" |
| invoicing_ready | `/admin/facturatie` | "Naar facturatie" |
| availability_conflict | `/admin/partners/{partner_id}` | "Bekijk partner" |
| request_no_response | `/admin/aanvragen/{request_id}` | "Bekijk aanvraag" |
| quote_expired_partner | `/admin/logies/{request_id}` | "Bekijk logies" |

Linked partners en requests worden clickable deep links naar de specifieke detail-pagina (niet meer generiek `/admin/partners`).

**3. Auto-resolve implementeren**

Wanneer een partner of klant de verwachte actie uitvoert, wordt de bijbehorende todo automatisch op "done" gezet:

- Partner reageert op activiteit → resolve `partner_reminder`
- Partner dient logiesofferte in → resolve `quote_pending_partner`
- Klant kiest offerte → resolve `quote_pending_customer`
- Voorwaarden geaccepteerd → resolve `terms_reminder`

Dit wordt geïmplementeerd in de bestaande edge functions die deze statuswijzigingen verwerken (`update-partner-item-status`, `select-accommodation-quote`, `accept-quote-proposal`).

**4. Groepering per auto_type + badge in sidebar**

- Todo's gegroepeerd per type (met collapse), handmatige todo's apart
- Sidebar-item "Taken" krijgt een badge met het aantal openstaande taken
- Bulk-actie: meerdere todo's tegelijk afvinken

**5. Snooze-functionaliteit**

Een "Snooze" knop die een todo verbergt tot een gekozen datum. Vereist een nieuw `snoozed_until` kolom op `admin_todos`.

### Technische wijzigingen

**Database migratie:**
- `ALTER TABLE admin_todos ADD COLUMN snoozed_until date;`

**Bestanden:**

| Bestand | Wijziging |
|---|---|
| `src/pages/admin/AdminTodos.tsx` | Volledige upgrade: tabs (Taken/E-maillog/Activiteitenlog), deep links, snelacties, groepering, bulk-acties, snooze |
| `src/components/admin/AdminLayout.tsx` | Todo's verplaatsen naar "Operationeel", badge toevoegen |
| `src/lib/autoTodoCreator.ts` | Geen wijzigingen nodig |
| `supabase/functions/update-partner-item-status/index.ts` | `resolveAutoTodo("partner_reminder", itemId)` toevoegen |
| `supabase/functions/select-accommodation-quote/index.ts` | `resolveAutoTodo("quote_pending_customer", requestId)` toevoegen |
| `supabase/functions/accept-quote-proposal/index.ts` | `resolveAutoTodo("terms_reminder", requestId)` toevoegen |
| Edge functions met quote-submit logica | `resolveAutoTodo("quote_pending_partner", requestId)` toevoegen |

De aparte pagina's `/admin/berichten` en `/admin/logs` blijven bestaan als routes maar worden doorgestuurd of verwijderd uit de sidebar — alles zit nu onder de tabs op de todo-pagina.

### Sidebar structuur na wijziging

```text
Operationeel
  ├─ Dashboard
  ├─ Taken (badge: 12)     ← was "Todo's" onder Systeem
  ├─ Projecten
  ├─ CRM
  ├─ Partners
  └─ Chat

Systeem
  └─ Instellingen          ← logs en mails nu als tabs onder Taken
```

