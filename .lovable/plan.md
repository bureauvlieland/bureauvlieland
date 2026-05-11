
## Uitgangspunt

We pakken de BV-2604-0010-problemen aan met dezelfde discipline als Iteratie A/B/C uit `.lovable/plan.md`:
- **A-vangnet eerst**: elke laag die we aanraken krijgt eerst echte types uit `src/integrations/supabase/types.ts` — geen `as any`.
- **B-bewijs per stap**: per substap plak ik in chat een korte verificatie (DB-rij, screenshot-locatie of ripgrep-bewijs) voordat we doorgaan.
- **C-audit-aansluiting**: Fase 4a raakt `isBureauItem` (`@deprecated`) en de `audit-legacy-concepts.md`-regels voor `projectWorkflow.ts` en `AdminRequestDetail.tsx`. Beslissingen die we nemen, voer ik gelijk in dat doc door.

Geen DB-migraties. Geen UI-redesign. Alleen presentatie- en workflow-logica, plus één edge-function-uitbreiding.

---

## Fase 4a — Eén workflow-bron in admin (gate voor 4b–4d)

**Doel:** Admin-overzicht en verzendknop tonen exact dezelfde fase per item, gebaseerd op één helper.

**Scope (geen functionele veranderingen, alleen consolidatie):**
- `src/lib/projectWorkflow.ts`: `getItemSendPhase` blijft de bron; `isBureauItem` wordt verwijderd uit alle call-sites (audit-beslissing).
- `src/pages/admin/AdminRequestDetail.tsx`: alle status-labels (`Wacht op aanbieder` / `Wacht op klant` / `Klaar voor partner` / `Verstuurd`) gaan via `getItemSendPhase`. Geen losse string-checks meer.
- `supabase/functions/send-items-to-partners/index.ts`: dry-run en echte verzending gebruiken dezelfde fase-regels (item is alleen "klaar" als `getItemSendPhase` dat zegt) — zo kan de popup nooit meer iets tonen wat de overzichtsregel niet "klaar" noemt.

**A-vangnet:** types voor `ItemForSendPhase` en `ProjectForItemPhase` afstemmen op `Database['public']['Tables']['program_request_items']['Row']` resp. `…['program_requests']['Row']`. Geen `as any` in deze drie bestanden.

**B-bewijs:** open BV-2604-0010 in `/admin/werkbank` → plak in chat per item: status-label in lijst + wat de "Bekijk & verstuur"-popup laat zien. Beide moeten matchen.

---

## Fase 4b — Tijden eenduidig (admin + klant + partner)

**Doel:** Eén effectieve tijd per item. Admin-wijziging is definitief, geen "was: 13:30"-verwarring meer.

**Scope:**
- Effectieve tijd overal: `confirmed_time || proposed_time || preferred_time`.
- Admin-tijdwijziging (`update-customer-program` of admin-edit-pad): zet zowel `preferred_time` als `confirmed_time` op de nieuwe waarde + log `status_note` als "Tijd … aangepast door Bureau Vlieland". Geen `proposed_time` meer voor admin-overrides.
- `src/components/customer-portal/CustomerTimeline.tsx` (sortering klopt al), `CustomerProgramItem.tsx`: `status_note` met "ingesteld door admin" wordt getoond als Bureau-Vlieland-melding, niet als "Reactie aanbieder".
- `src/pages/admin/AdminRequestDetail.tsx` lijstweergave: één tijd, geen "was:" tenzij er een echte partner-`proposed_time` is die afwijkt.
- Partner-portal (`PartnerItemCard`/`PartnerItemSheet`): toont effectieve tijd in plaats van alleen `preferred_time`.

**A-vangnet:** kleine helper `getEffectiveTime(item)` met expliciet `Pick<Row, "confirmed_time"|"proposed_time"|"preferred_time">` — gebruikt door alle vier de plekken.

**B-bewijs:** na codefix datacorrectie voor BV-2604-0010 Beach Golf (`preferred_time = confirmed_time = 11:30`) en plak DB-rij + screenshot-locaties (admin-lijst, klantpagina, partnerportal) in chat.

---

## Fase 4c — Per-item naar partner sturen, los van programma-akkoord

**Doel:** Admin kan één onderdeel naar de partner sturen ook als de klant het hele programma nog niet formeel heeft geakkordeerd. Akkoord is een afspraak tussen Bureau Vlieland en klant, geen technische blokkade.

**Scope:**
- `supabase/functions/send-items-to-partners/index.ts`: optionele body-parameter `mode: "auto" | "force"`. In `force` vervalt de gate op `customer_approved_at`/`quote_status`. Filtering blijft: `block_type !== 'bureau'`, `day_index !== -1`, `skip_partner_notification = true`, `status !== 'cancelled'`.
- `AdminRequestDetail.tsx`: per item een actie "Stuur naar partner" als fase = `klaar_voor_partner` óf `wacht_op_klant`. In het laatste geval een korte inline-melding ("Klant heeft het programma nog niet formeel akkoord — toch versturen?").
- "Bekijk & verstuur"-popup blijft bestaan voor bulk, maar gebruikt dezelfde fase-regels (4a) en geeft duidelijk aan welke items in `wacht_op_klant` zitten.

**A-vangnet:** edge-function input via expliciete TS-interface (geen `body: any`); response-type met `sent_item_ids`/`skipped_item_ids`.

**B-bewijs:** test op een dummy/staging-item: stuur één item in `wacht_op_klant` met `mode: force`, plak edge-log + DB-rij (`skip_partner_notification = false`, `email_log` entry).

---

## Fase 4d — Klant kan zelf tijden voorstellen vóór akkoord + partner-dashboard opschonen

**Doel:** Twee laatste blokkers wegnemen.

**Scope klant-tijdvoorstel:**
- `CustomerProgramItem.tsx` in quote-mode: per item dat nog niet `customer_approved_at` heeft een knop "Andere tijd voorstellen". Schrijft `customer_counter_time` (bestaand veld), géén partner-flow, géén status-wijziging.
- Admin ziet dat in de lijst als kleine indicator ("Klant stelt voor: 10:00") naast de effectieve tijd.

**Scope partner-dashboard (`get-partner-dashboard` + `PartnerUnifiedList`):**
- Verberg standaard uit actieve tabs: items met `status` in (`cancelled`, `unavailable`, `rejected`, `expired`), items van projecten met `status = cancelled`, en alles met `skip_partner_notification = true`.
- Eigen tab "Afgerond / niet meer relevant" toont deze items wel (retentie blijft 3 maanden conform `mem://infrastructure/partner-dashboard-retention-policy`).

**A-vangnet:** `get-partner-dashboard` response-types al gedefinieerd in `src/types/partner.ts`; uitbreiden met `archived_items: PartnerItem[]`. Geen `as any` in `usePartnerDashboard.ts` of `PartnerUnifiedList.tsx`.

**B-bewijs:**
- Klantportaal: tijdvoorstel op een test-item → DB-rij (`customer_counter_time`) + admin-lijst toont indicator.
- Partner-portal: log in als de partner van BV-2604-0010 → actieve tab toont alleen relevante items, archief-tab toont de rest.

---

## Datacorrectie (na Fase 4b)

Eénmalige update voor BV-2604-0010 Beach Golf:
```text
preferred_time = '11:30'
confirmed_time = '11:30'
proposed_time  = NULL
status_note    = 'Tijd 11:30 ingesteld door Bureau Vlieland (op verzoek klant)'
```
Plus controle op andere items in dit project waar `confirmed_time` afwijkt van `preferred_time` zonder partner-`proposed_time`.

---

## Regressie-checklist (verplicht na Fase 4d)

Plak resultaat per regel in chat:

1. Admin verandert tijd op niet-verzonden item → admin-lijst, klantpagina, partner-preview tonen allemaal nieuwe tijd, geen "was:".
2. Partner doet `proposed_time` → admin-lijst toont "voorstel: 14:00 (was 11:30)".
3. Klant doet `customer_counter_time` in offertefase → admin ziet indicator, partner ziet niets.
4. Per-item "Stuur naar partner" werkt vóór klant-akkoord (force-mode) en e-mail gaat uit.
5. Bulk "Bekijk & verstuur"-popup en admin-lijst noemen exact dezelfde items "klaar".
6. Status-label in lijst = fase uit `getItemSendPhase` — geen tegenstrijdige labels.
7. Partner-dashboard: actieve tab schoon, archief-tab toont oude/geannuleerde items.
8. Geen `as any` toegevoegd in de geraakte bestanden (ripgrep-bewijs).

---

## Volgorde & gates

```text
4a (workflow-bron + types)  ──▶ B-bewijs ──▶ 4b (tijden + types)
                                              │
                                              ▼ B-bewijs
                                            4c (per-item versturen + edge-types)
                                              │
                                              ▼ B-bewijs
                                            4d (klant-tijdvoorstel + partner-archief)
                                              │
                                              ▼ regressie-checklist
                                            Fase 5 (`program_type` → `origin`)
```

Elke gate is hard: zonder bewijs in chat geen volgende stap. Audit-doc-regels die we onderweg vastleggen, voer ik direct door in `.lovable/audit-legacy-concepts.md`.

## Buiten scope

- Geen DB-migraties (alle velden bestaan al).
- Geen wijzigingen aan logies-flow, facturatie, of `bureau_central`-regels.
- Geen visuele redesign — alleen labels, knoppen en filters.
