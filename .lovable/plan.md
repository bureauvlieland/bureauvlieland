
# Claudia — admin AI-assistent (Niveau 1 + 2)

## Wat Claudia precies doet

**Rol:** dagelijkse operationele co-piloot van Bureau Vlieland, alleen voor admin (Erwin/jij). Géén klant- of partnercontact in deze fase.

**Drie kerntaken:**

1. **Dagelijkse aanbevelingen** (cron 06:00 NL-tijd): scant alle live data en produceert een geprioriteerde top-N actielijst. Voorbeelden:
   - "Project BV-2611-0023 wacht 6 dagen op partner Strandpaviljoen — stuur reminder"
   - "Logies-aanvraag LOG-2611-0008 heeft 0 partners benaderd"
   - "Quote €4.200 verloopt over 24u, klant heeft nog niet gereageerd"
   - "Factuur BVC-2610-0014 staat 18 dagen open"
   - "3 partners hebben deze maand nog geen enkele aanvraag gehad"

2. **Vraag-aan-Claudia chat** (in Werkbank-sidebar): admin stelt vrije vraag, Claudia antwoordt op basis van live DB + kennisbank. Voorbeelden:
   - "Welke bouwstenen passen bij een 30-persoons heisessie in regen?"
   - "Welke partner heeft historisch de beste conversie op blokarten?"
   - "Vat de status van project X samen"
   - "Hoeveel commissie staat er nog open?"

3. **Slimme suggesties bij creatie** (later, niet in v1): bij nieuw project automatisch templates/partners voorstellen op basis van vergelijkbare historie.

## Wat Claudia kan & weet

| Bron | Hoe gebruikt | Privacy |
|------|--------------|---------|
| Live database (projecten, items, quotes, todos, facturen, e-mail logs) | Direct gequeried per request | Admin-only via RLS + `is_admin` check |
| Bouwstenen + categorieën | Geïndexeerd in pgvector (embeddings) | Geen PII |
| Programma-templates | Geïndexeerd in pgvector | Geen PII |
| Partner-profielen (publieke velden + historische performance) | Geïndexeerd in pgvector | Stripped van interne notities |
| App-settings & business rules (commissie, toeristenbelasting, etc.) | Als systeem-context in elke prompt | n.v.t. |

**Wat ze NIET doet (in v1):**
- Geen e-mails versturen of todo's aanmaken zelf — alleen aanbevelen
- Geen klant- of partnerportaal-presence
- Geen ferry-tijden gokken (verwijst naar Doeksen API)
- Geen prijs- of juridische uitspraken

## "Leert" Claudia?

Niet door modeltraining. Wel:
- **Kennisbank groeit automatisch**: nieuwe/gewijzigde bouwstenen, templates en partners worden binnen 5 min opnieuw geëmbed via DB-trigger.
- **Feedback-loop**: admin kan elke aanbeveling "✓ opgepakt" / "✕ niet relevant" markeren. Deze feedback wordt meegegeven als context bij de volgende dagrun ("admin negeert reminders ouder dan X dagen", "admin volgt facturatie-tips altijd op").
- **Geen lange-termijn geheugen** buiten DB — alle "kennis" is op elk moment reproduceerbaar uit de huidige database-staat.

## Architectuur

```
┌─────────────────────────────────────────────────┐
│  Werkbank UI (admin-only)                       │
│  ├─ <ClaudiaRecommendationsCard /> (top)        │
│  ├─ <ClaudiaChatPanel />          (sidebar)     │
│  └─ Topbar: 🔔 ClaudiaBadge (count nieuwe)     │
└─────────────────────────────────────────────────┘
              │                    │
              ▼                    ▼
   ┌───────────────────┐  ┌───────────────────┐
   │ admin_recommend.. │  │ edge: claudia-chat│
   │ (DB tabel)        │  │ (streaming)       │
   └───────────────────┘  └───────────────────┘
              ▲                    │
              │                    ▼
   ┌──────────────────────────────────────┐
   │ edge: claudia-daily-scan (cron 06:00)│
   │  1. Query 8-10 signalen uit DB       │
   │  2. RAG-context ophalen (pgvector)   │
   │  3. Lovable AI → tool-call           │
   │  4. Insert in admin_recommendations  │
   └──────────────────────────────────────┘
              ▲
              │ embedded content
   ┌──────────────────────────────────────┐
   │ edge: claudia-reindex                │
   │  (DB trigger op blocks/templates/    │
   │   partners → re-embed gewijzigde rij)│
   │  pgvector(documents) tabel           │
   └──────────────────────────────────────┘
```

## Bouwfases

### Fase A — Fundering (DB + RAG)
1. Migration: `pgvector` extension aan, `claudia_documents` tabel (id, source_type, source_id, content, embedding vector(1536), metadata, model_version, updated_at) + HNSW index.
2. Migration: `admin_recommendations` tabel (id, kind, priority, title, body, related_entity_type, related_entity_id, status [open/done/dismissed], feedback, created_at, expires_at). RLS: alleen admin.
3. Migration: `match_claudia_documents(query_embedding, source_types[], match_count)` SQL function.
4. Edge function `claudia-reindex`: krijgt `{source_type, source_id}`, leest huidige rij, embed via Lovable AI Gateway (`google/gemini-embedding-001`, dimensions 1536), upsert in `claudia_documents`.
5. Eenmalig backfill-script: alle `building_blocks` waar `status='published'`, alle `program_templates`, alle `partners` waar `is_active=true` → embed.

### Fase B — Daily scan + UI
6. Edge function `claudia-daily-scan`: queries voor 8 signaal-categorieën (overdue partner replies, expiring quotes, idle accommodations, open invoices, project status anomalies, partner workload imbalance, post-execution todos, missing critical fields). Per categorie max 5 items. Stuurt structured tool-call naar Lovable AI (`google/gemini-3-flash-preview`) om te prioriteren + Nederlandstalig te formuleren. Insert in `admin_recommendations` met `expires_at = now() + 24h`.
7. Cron-schedule: `0 5 * * *` UTC (= 06:00 NL winter / 07:00 zomer; goed genoeg). Setup via `pg_cron` + `pg_net`.
8. UI component `ClaudiaRecommendationsCard.tsx` op Werkbank: sectie bovenaan met aanbevelingen gegroepeerd per priority (urgent/normaal/info). Per item: titel, body, deeplink naar entity, knoppen ✓ Opgepakt / ✕ Niet relevant.
9. UI component `ClaudiaBadge.tsx` in `AdminLayout` topbar: belletje met count `status='open'`.

### Fase C — Chat
10. Edge function `claudia-chat`: streaming SSE. Bouwt system prompt met (a) Bureau Vlieland context uit core memory, (b) RAG-resultaten uit `claudia_documents` op basis van vraag-embedding, (c) live DB-snapshot relevant voor de vraag (tool-calling: `query_projects`, `query_partners`, `query_financial_summary`). Verifieert admin via JWT.
11. UI `ClaudiaChatPanel.tsx`: collapsable sidebar op Werkbank met chat-geschiedenis (alleen huidige sessie, niet gepersisteerd in v1), markdown rendering, streaming tokens.

### Fase D — Feedback & polish
12. Feedback-actie schrijft naar `admin_recommendations.feedback` + `status`. Daily scan leest laatste 30 dagen feedback en geeft samenvatting mee als context.
13. AdminSettings sectie "Claudia" met aan/uit knop per categorie + handmatige "Run nu" knop.
14. Admin-only MEM toevoegen + index.md update.

## Technische details

- **AI model**: `google/gemini-3-flash-preview` voor zowel daily scan als chat (snel, goedkoop, structured output via tool-calling). Embeddings: `google/gemini-embedding-001` met `dimensions: 1536` om bij `vector(1536)` kolom te passen.
- **RLS**: `admin_recommendations` en `claudia_documents` alleen leesbaar via `is_admin(auth.uid())`. Edge functions gebruiken service role.
- **Logging**: alle Claudia-runs naar bestaande `email_log`-achtige structuur (nieuwe tabel `claudia_run_log`) zodat je traceable bent welke prompt/respons resulteerde in welke aanbeveling.
- **Kosten-schatting**: 1× daily scan ~€0,005, 50 chat-vragen/dag ~€0,15/maand, embeddings backfill eenmalig ~€0,50, daarna verwaarloosbaar.
- **Rate-limit / 402 / 429** worden netjes opgevangen en als toast getoond.

## Wat ik in deze build-ronde wel/niet doe

**Wel (deze ronde):** Fase A (1-5) + Fase B (6-9). Dat is "Claudia leeft": dagelijkse aanbevelingen op de Werkbank + badge in de topbar, met RAG-fundament klaar.

**Niet deze ronde (volgende prompt):** Fase C (chat) + Fase D (feedback-polish). Reden: chat heeft veel UI-werk en is pas zinvol als de aanbevelingen-laag goed staat. Zo kun je Claudia eerst een paar dagen "stilletjes" zien aanbevelen voordat we conversational gaan.

Akkoord met deze scope en volgorde, of wil je iets schuiven (bv. chat eerder, of feedback-loop direct mee)?
