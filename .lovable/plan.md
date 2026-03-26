

## Plan: Werklijst-gedreven admin workflow

### Probleem
De huidige admin-interface vereist dat je *weet* wat je moet doen. Informatie is verspreid over het Werkoverzicht (status per project), de Todo-widget (auto-taken), en de projecttabel (uitklapbare details). Er ontbreken cruciale workflow-triggers en de taken die wél worden aangemaakt zijn niet specifiek genoeg qua vervolgactie.

### Huidige situatie
**Wat al auto-todos genereert:**
- `quote_review` — partner dient logiesofferte in
- `availability_conflict` — beschikbaarheidsconflict
- `bureau_item_pricing` — bureau-item zonder prijs
- `all_partners_responded` — alle partners hebben gereageerd
- `terms_reminder` — alle items bevestigd, voorwaarden nog niet getekend
- `invoicing_ready` — voorwaarden geaccepteerd
- `commission_pending` — commissie bevestigd door partner
- `post_execution_feedback` / `post_execution_invoice_check` — na uitvoering

**Wat NIET automatisch een todo genereert (maar wel actie vereist):**
1. Nieuw project binnengekomen → programma samenstellen
2. Programma klaar → offerte versturen naar klant
3. Klant geeft akkoord → items naar partners sturen
4. Partner bevestigt/alternatief → klant informeren of offerte doorsturen
5. Logiesofferte beoordeeld → doorsturen naar klant
6. Klant kiest logies → bevestiging versturen
7. Offerte bijna verlopen → herinnering sturen

### Oplossing: 3 pijlers

---

#### Pijler 1: Uitgebreidere auto-todo generatie (7 nieuwe triggers)

Nieuwe `AutoTodoType`s toevoegen en op de juiste momenten triggeren:

| Type | Trigger-moment | Titel-voorbeeld | Prioriteit |
|------|---------------|-----------------|-----------|
| `new_request_received` | Nieuwe program_request | "Nieuwe aanvraag: Bedrijf X — programma samenstellen" | high |
| `quote_ready_to_send` | Alle items hebben prijs + alle partners gereageerd | "Offerte klaar: Bedrijf X — verstuur naar klant" | high |
| `send_items_to_partners` | Klant geeft akkoord op offerte | "Akkoord ontvangen: Bedrijf X — stuur items naar partners" | high |
| `partner_status_update` | Partner bevestigt/alternatief/unavailable | "Partner X reageert op [activiteit] — beoordeel reactie" | normal |
| `forward_accommodation_quote` | Admin beoordeelt logiesofferte (na quote_review) | "Logiesofferte Zeezicht klaar — doorsturen naar Klant X" | normal |
| `quote_expiring_soon` | 3 dagen voor verloopdatum offerte | "Offerte Bedrijf X verloopt over 3 dagen" | high |
| `customer_counter_proposal` | Klant dient tegenvoorstel in | "Tegenvoorstel: Klant X voor [activiteit] — beoordelen" | high |

**Implementatie:**
- `autoTodoCreator.ts` — nieuwe types + titels toevoegen
- Edge functions — triggers toevoegen in `send-program-request`, `accept-quote-proposal`, `update-partner-item-status`, `select-accommodation-quote`, `check-pending-items`
- Client-side — trigger in `AdminSendQuoteDialog` (na versturen), `AdminAccommodationQuoteSheet` (na beoordeling)

---

#### Pijler 2: Dashboard Todo Widget → primaire werklijst

De huidige `DashboardTodoWidget` upgraden van klein zijpaneel-widget naar **het primaire werkonderdeel** van het dashboard:

1. **Verplaats naar de hoofdkolom** (nu in sidebar, straks linksboven als eerste item)
2. **Toon meer context per taak:**
   - Kleur-badge per `auto_type` (al beschikbaar via `autoTodoTypeConfig`)
   - Deep-link knop "→ Afhandelen" die direct naar de juiste pagina linkt (al in `autoTypeActionConfig`, uitbreiden voor nieuwe types)
   - Relatieve tijd ("2 uur geleden", "gisteren")
3. **Groepering op actie-eigenaar:** "Jouw actie" vs "Wachtend op ander" sectie
4. **Inline afhandelen:** Checkbox om af te vinken + optionele snooze
5. **Limiet verhogen** van 5 naar 10, met "Alle taken" link

---

#### Pijler 3: Werkoverzicht vereenvoudigen

Het huidige `WorkOverview` bevat overlap met de verbeterde takenlijst. Aanpassing:

1. **WorkOverview wordt compacter** — alleen projecten tonen waar de admin zélf actie moet ondernemen (filter `actionOwner === "admin"`)
2. **Integreer de "volgende stap" direct in elke project-rij** — niet alleen een statuslabel maar een actie-knop ("Verstuur offerte", "Stuur naar partners")
3. **Verwijder duplicatie** — de todo-widget toont de specifieke taken, het werkoverzicht toont het project-niveau overzicht

---

### Technische details

**Bestanden die worden gewijzigd:**

1. `src/lib/autoTodoCreator.ts` — 7 nieuwe types, titels, UI-config
2. `src/components/admin/DashboardTodoWidget.tsx` — volledige upgrade naar werklijst
3. `src/components/admin/WorkOverview.tsx` — filter op admin-actie, actieknoppen
4. `src/pages/admin/AdminDashboard.tsx` — layout herschikken (taken naar hoofdkolom)
5. `src/pages/admin/AdminTodos.tsx` — `autoTypeActionConfig` uitbreiden voor nieuwe types
6. `supabase/functions/send-program-request/index.ts` — `new_request_received` todo
7. `supabase/functions/accept-quote-proposal/index.ts` — `send_items_to_partners` todo
8. `supabase/functions/update-partner-item-status/index.ts` — `partner_status_update` todo
9. `supabase/functions/check-pending-items/index.ts` — `quote_expiring_soon` todo
10. `supabase/functions/update-customer-program/index.ts` — `customer_counter_proposal` todo
11. `supabase/functions/select-accommodation-quote/index.ts` — resolve + forward todo

**Geen database-wijzigingen nodig** — `admin_todos` tabel ondersteunt al alle velden (`auto_type`, `auto_entity_id`, `related_request_id`, `related_partner_id`).

### Volgorde van implementatie
1. Eerst: nieuwe auto-todo types + titels in `autoTodoCreator.ts`
2. Dan: edge function triggers (6 functies)
3. Dan: dashboard layout + widget upgrade
4. Tot slot: werkoverzicht vereenvoudigen

