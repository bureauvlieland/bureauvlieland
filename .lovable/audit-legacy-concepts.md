## Audit legacy concepten — afsluiting (mei 2026)

| Onderwerp | Status |
|---|---|
| Fase 4a — `ItemDisplayStatusBadge` overal uniform | ✅ |
| Fase 4b — Effectieve tijd (`confirmed > proposed > preferred`) in UI | ✅ |
| Fase 4b — Effectieve tijd in alle outbound mails (6 edge-functies) | ✅ |
| Fase 4c — Force-send (`mode: "force"`) per item | ✅ |
| Fase 4d — Klant-tegenvoorstel: bureau-mail + admin-todo + MicroPill | ✅ |
| Fase 4 — bureau-items uitgesloten in cancel/delete/price-mails | ✅ gecontroleerd |
| Fase 5 — `program_type` referenties in edge-functies/templates | ✅ geen open call-sites |
| Statusmails — "Aan zet:"-regel via `actor_line` variabele | ✅ |
| Mail-log popover in werkbank (optioneel) | ⏳ open — volgende ronde |

Geen DB-migraties uitgevoerd buiten `email_templates` (drie status-templates: `actor_line` toegevoegd).
