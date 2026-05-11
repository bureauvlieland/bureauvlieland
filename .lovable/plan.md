## Waar we nu staan

**Klaar (fundering):**
- Werkbank-shell met Inbox/Projecten-tab, Claudia-paneel (alleen-lezen), quick-views, kind-filter via `?kind=…`, archief-toggle via `?archief=1`.
- `getProject.ts` + `getInbox.ts` + `projectCommunication.ts` als single source voor lijst-data.
- Sidebar opgeschoond (Dashboard/Taken/Projecten/Logies eruit), legacy-routes redirecten naar `/admin/werkbank`.
- ProjectDetailPanel gebruikt **wel** de juiste kolommen (`preferred_time/confirmed_time`, `accommodation_name`, `room_configuration`) — dat is in een eerdere ronde gerepareerd.
- Archief-feature werkend: 17 actief/afgerond + 21 archief.

**Open (technisch krediet):**
- ~14 `as any` / `: any` casts in `getProject.ts` en `ProjectDetailPanel.tsx`. Die maskeren toekomstige schemafouten zoals destijds met `room_summary`.
- Geen typecontract met de gegenereerde `Database` types uit `src/integrations/supabase/types.ts`.
- Per tab nog geen handmatige verificatie met bewijs (dat was de afspraak).
- `.lovable/audit-legacy-concepts.md` is een lijst van call-sites — er staat nog **geen beslissing per call-site**. Zonder die beslissingen kunnen Fase 4 (bureau-rolfusie) en Fase 5 (`program_type` weg) niet veilig starten.

**Open (functioneel):**
- Claudia heeft nog geen schrijftools (todo's, snooze, notities).
- Inbox sluit todo's nog niet automatisch af bij geannuleerd project (eerder genoemde optie).
- Fase 4 (bureau-rolfusie) en Fase 5 (één projectmodel) niet gestart.

---

## Voorstel: eerst consolideren, dan pas door

Drie kleine iteraties, elk met expliciete acceptatiecriteria + bewijs in de chat. Pas daarna Claudia-schrijftools en Fase 4.

### Iteratie A — Types als vangnet (technisch)

**Doel:** elke `any` in de Werkbank-data-laag vervangen door types uit `src/integrations/supabase/types.ts`. Zo vangt `tsc` voortaan kolomnaam-fouten direct.

**Scope:**
- `src/lib/getProject.ts` — alle 14 casts weg. Rij-types uit `Database['public']['Tables'][...]['Row']`, joins via expliciete sub-types.
- `src/components/admin/werkbank/ProjectDetailPanel.tsx` — local `ItemRow` / `LodgingRow` typedefs vervangen door database-rijen + Pick.
- `src/components/admin/werkbank/InboxList.tsx` — alleen waar nog losse casts staan.

**Acceptatie:**
- 0 hits voor `as any` / `: any` in deze drie bestanden (ripgrep-bewijs in chat).
- `bun run build` (auto) zonder TS-fouten.

### Iteratie B — Per-tab verificatie met bewijs

**Doel:** voor één representatief project (bv. een actief BV-project + één logies-only) bevestigen dat élke detailpaneel-tab data toont.

**Werkwijze:** ik open `/admin/werkbank?id=…`, kijk console + netwerk, plak per tab in chat:
- aantal items / quotes / facturen / communicatie-events
- één voorbeeldregel met de échte velden (datum, tijd, prijs, partner)

**Acceptatie:**
- 5 tabs (Overzicht / Programma / Logies / Financieel / Communicatie) tonen data of een lege staat met uitleg — geen errors, geen loading-loops.
- Archief-project openen werkt ook.

### Iteratie C — Audit afmaken (gate voor Fase 4/5)

**Doel:** `.lovable/audit-legacy-concepts.md` per call-site een beslissing geven, zodat Fase 4 en 5 mechanisch uit te voeren zijn.

**Per regel:** `behoud / verwijder / vervang door X`. Plus een korte regressie-checklist (configurator-checkout, partner-portal login, klant-portal-link, bestaande factuur).

**Acceptatie:**
- Elke bullet in audit-doc heeft een beslissing.
- Onderaan staat de regressie-checklist die we vóór Fase 4 én vóór Fase 5 doorlopen.

---

## Daarna — vervolg in volgorde

4. **Claudia schrijftools** — todo's aanmaken/afsluiten, projecten snoozen, notitie loggen. Edge function uitbreiden + UI-bevestiging in paneel.
5. **Inbox auto-cleanup** — todo's met `related_request_id` van een geannuleerd project automatisch afsluiten (trigger of edge-job).
6. **Fase 4 — bureau-rolfusie** — alleen na audit. `isBureauItem()` weg, `block_type='bureau'` blijft als tag, interne checklist voor bureau-acties, partner-record `bureau` filteren uit lijsten.
7. **Fase 5 — `program_type` → `origin`** — workflow-branches verwijderen, kolom behouden als analytics-metadata.

---

## Werkregels die we vasthouden

- Eén Supabase-query per scherm in een hook — geen losse `.from(...).select(...)` strings in components.
- Per iteratie: acceptatiecriterium + bewijs in chat vóór "klaar".
- Vóór elke wijziging: raakt dit een regel uit `mem://index.md`? Zo ja, expliciet noemen.
- Geen dikke fasen meer — als een fase 3 features bevat, splitsen in 3a/3b/3c.

## Buiten scope (nu)

- Geen DB-migraties.
- Geen nieuwe features in detailpaneel (bewerken/acties komen in Claudia-tools en Fase 4).
- Geen UI-redesign.
