## Doel

Eén werkomgeving voor het bureau die (1) communicatie- én projectstatus in één blik laat zien, (2) Dashboard + Taken + Projecten samenvoegt, (3) onder water het kunstmatige onderscheid weghaalt tussen **bureau-als-partner** en **admin**, en tussen **maatwerk** en **klantprogramma's**, (4) **logies én programma** verenigt onder één projectbegrip (ook logies-only blijft een volwaardig project met eigen facturatie + commissie), en (5) een **AI-assistent "Claudia"** toevoegt via de **Lovable AI Gateway** die meedenkt en routinewerk automatiseert. Less is more.

## Kernidee in één plaatje

```text
PROJECT (afgeleid concept, één dossier per klant-aanvraag)
├── Programma-spoor   → program_requests + program_request_items
├── Logies-spoor      → accommodation_requests + accommodation_quotes
├── Communicatie       → email_log, project_communications, chat_messages
└── Financieel         → bureau_invoices, commission_invoices

Werkbank (één pagina)
├── Tab: Inbox          (gemixte werkitems, één rij per project)
└── Tab: Projecten      (alle dossiers, twee statusassen + dual sub-status)

Claudia (AI-co-piloot via Lovable AI Gateway)
├── Daginstart 3×/dag (08:30 / 13:00 / 17:00)
├── Chat-paneel "Overleg met Claudia"
└── Inline suggesties per project
```

## Architectuur: één project, twee sporen (Optie A — uitgewerkt)

### Project-overlay (geen risicovolle migratie)

We voegen een **conceptuele "Project"-laag** toe die `program_requests` en `accommodation_requests` aan elkaar plakt via de bestaande `linked_program_id` / `linked_accommodation_id` koppeling. Drie typen projecten worden allemaal als volwaardig dossier behandeld:

| Type | Programma-spoor | Logies-spoor | Voorbeeld |
|------|-----------------|--------------|-----------|
| **Programma + Logies** | ✓ | ✓ | Meerdaags bedrijfsuitje met overnachting |
| **Programma-only** | ✓ | — | Dagprogramma zonder logies |
| **Logies-only** | — (lege placeholder) | ✓ | Klant boekt alleen overnachting via bureau |

**Logies-only blijft volwaardig**: factureren, commissie, communicatie, dossier, AI-suggesties — alles werkt hetzelfde. De bestaande trigger `create_program_for_accommodation()` maakt al een lege `program_request` aan bij elke `accommodation_request`, dus elk logies-dossier heeft al een `program_request` als anker. **Daar blijven we op bouwen** — geen schema-breuk.

### Project-helper

Eén nieuwe helper `getProject(programRequestId)` die teruggeeft:

```ts
type Project = {
  id: string;                      // = program_request.id (anchor)
  reference: string;               // BV-2604-0008 (of LOG-… als logies-only)
  customer: { name, email, phone, company };
  dates: Date[];
  numberOfPeople: number;
  programTrack?: { items, quote_status, ... };
  lodgingTrack?: { request, quotes, selectedQuote, ... };
  pipeline: ProjectPipelineStage;          // overall (programma + logies samen)
  comm: ProjectCommunicationState;         // wie is aan zet
  programComm: ProjectCommunicationState;  // sub-status programma
  lodgingComm: ProjectCommunicationState;  // sub-status logies
  financials: { grand_total, invoiced, outstanding, commission };
};
```

De pipeline-stage neemt de **meest urgente** sub-status (logies + programma) als overall stage. De comm-status vertelt wie nu aan zet is op het meest blokkerende spoor.

### Reference-nummering

- Logies-only projecten tonen we als hun `LOG-YYMM-NNNN` (al beschikbaar, `generate_accommodation_reference_number`).
- Combi-projecten als `BV-YYMM-NNNN` met logies-badge.
- Werkbank-zoek werkt op beide.

## Werkbank-UI (vervangt Dashboard + Taken + Projecten)

`/admin/werkbank` met split-view (lijst links, persistent detailpaneel rechts) en twee tabs: **Inbox** + **Projecten**.

```text
┌────────────────────────────────────────────────────────────────────┐
│ Werkbank   [Inbox|Projecten]                    [💬 Claudia]      │
├──────────────────────┬─────────────────────────────────────────────┤
│ Quick views          │ BV-2604-0008  Familie Jansen · 12-15 mei    │
│ • Wacht op mij  (4)  │ ┌───────────────────┬──────────────────┐    │
│ • Wacht op klant(12) │ │ Programma   🟠    │ Logies   🟣      │    │
│ • Wacht op partner(7)│ │ offerte verstuurd │ wacht op partner │    │
│ • Stilte > 5 dgn (3) │ └───────────────────┴──────────────────┘    │
│ ─ Lijst (compact) ── │                                              │
│ ◉ BV-2604-0008  🟠   │ Volgende stap: Hotel Badhuys herinneren     │
│ ◉ LOG-2604-0011 🟣   │ [Mail concept]  [Bel partner]  [Notitie]    │
│ ◉ BV-2604-0009  🟢   │                                              │
│                      │ ─ Tijdlijn (programma + logies samen) ──    │
│                      │  ─ 🤖 Claudia denkt mee ─                   │
│                      │     • Klant 6 dgn stil → herinnering        │
│                      │       [Concept openen]                       │
└──────────────────────┴─────────────────────────────────────────────┘
```

### Twee statusassen + dual sub-status

| As | Wat | Waarden |
|----|-----|---------|
| **Pipeline-stage** (per spoor + overall) | Waar staat het dossier in het verkoopproces | concept → offerte verstuurd → akkoord → AV getekend → facturatie → afgerond / geannuleerd |
| **Communicatie-status** (per spoor + overall) | Wie is nu aan zet | 🟢 Bij bureau · 🟠 Wacht op klant · 🔵 Wacht op partner · 🟣 Wacht op logies · 🔴 Stilte / opvolgen · ⚪ Klaar |

### Detailpaneel-tabs

`Overzicht` · `Programma` · `Logies` · `Financieel` · `Communicatie`

- **Overzicht**: dual-status-cards, volgende-stap-suggestie, snelle acties, Claudia-suggesties.
- **Programma / Logies**: bestaande detailweergaves, ingebed.
- **Financieel**: één tabel met alle factuurregels (programma + logies + commissie + extras), bestaande `recalculate_program_completion_status` rekent al door beide sporen.
- **Communicatie**: één tijdlijn (al unified via memory `unified-project-communication-dossier`).

### Sidebar-opschoning (van 17 naar ~10)

```
Operationeel
  • Werkbank          (vervangt Dashboard + Taken + Projecten + Logies-overzicht)
  • Planning
  • CRM
  • Chat
Content
  • Bouwstenen
  • Templates
  • Media
Financiën
  • Financieel       (tabs: Facturatie · Inkoop · Commissies)
Systeem
  • Instellingen     (incl. AI-instellingen-tab)
  • E-mailtemplates
```

`Logies` wordt geen apart sidebar-item meer; logies-projecten verschijnen gewoon in de Werkbank-lijst (met logies-badge en eigen filter).

## Bureau = admin (rolfusie)

- Geen aparte "Bureau Vlieland"-partnerpagina. Wat het bureau zelf doet wordt rechtstreeks in het Werkbank-detailpaneel afgewerkt als interne checklist.
- `block_type = "bureau"` blijft als leverancier-tag (informatief), niet als status- of workflow-knop.
- Bureau-items: vereenvoudigd statusverloop **Te plannen → Geregeld → Uitgevoerd → Gefactureerd**, met inline knop "Markeer geregeld".
- `isBureauItem()` (nu @deprecated) wordt definitief verwijderd; partner-record `bureau` wordt ge-archiveerd uit partnerlijsten.

## Eén projectmodel: gewoon "Project"

`program_type` (`self_service` / `quote` / `maatwerk_zakelijk` / `maatwerk_prive`) wordt teruggebracht tot één concept. Herkomst blijft als analytics-metadata (`origin: "customer_form" | "admin_created" | "configurator" | "lodging_only"`) maar stuurt geen workflow meer.

- Eén `quote_status`-flow voor alle projecten.
- Default `quote_status` = `concept`, `skip_partner_notification = true` bij creatie.
- Lijsten/filters/labels die het onderscheid tonen verdwijnen.

## Claudia — AI-co-piloot via Lovable AI Gateway

Default model `google/gemini-3-flash-preview` voor briefings/suggesties; `openai/gpt-5.2` met `reasoning.effort = "medium"` voor de chat als er nagedacht moet worden. `LOVABLE_API_KEY` is al beschikbaar.

### a. Daginstart-briefing (3× per dag)

Standaard om **08:30 / 13:00 / 17:00** (configureerbaar). Op de Werkbank verschijnt een briefingkaart bovenin:

```text
Goedemorgen — 7 mei, 08:30                            (Claudia)

Vandaag staan er 3 events op het eiland. Het meest urgent:
Familie Jansen wacht al 6 dagen op antwoord — concept-herinnering klaar.

3 acties die ik je vandaag aanraad:
1. Reactie op Hotel Badhuys — offerte verloopt morgen     [Open · Antwoord]
2. Vliehors Expres bevestigen voor BV-2606-0011           [Open · Mail partner]
3. Akkoord van klant Stoffels binnenhengelen              [Open · Reminder]

12 wacht-op-klant projecten · 4 wacht-op-partner · 2 logies-only stil.
```

Bron: dezelfde aggregator die de Inbox vult, gewogen door AI op urgentie + leeftijd + impact.

### b. Chat-paneel "Overleg met Claudia"

Persistent uitschuifbaar paneel rechts, streaming SSE. Voorbeelden:
- "Wat is er vandaag urgent?"
- "Geef me de stand van zaken voor BV-2604-0008 in 5 zinnen — programma én logies."
- "Schrijf een vriendelijke herinnering naar Familie Jansen — ze wachten al 6 dagen."
- "Welke logies-partners hebben deze week niet geantwoord?"
- "Maak een offerte-concept voor het programma in BV-2605-0002 met €X marge."

**Tool-calling** (functies die Claudia mag uitvoeren — schrijfacties altijd achter admin-bevestiging):

| Tool | Doel |
|------|------|
| `lijst_projecten(filter)` | Lijst projecten met communicatiestatus |
| `lees_project_dossier(id)` | Volledig dossier (programma + logies + comm + financieel) |
| `schrijf_concept_email(project_id, doel, toon)` | Opent `SendProjectEmailSheet` met concept |
| `maak_taak(project_id, titel, prioriteit, deadline)` | Schrijft naar `admin_todos` |
| `markeer_klaar(taak_id)` | Alleen na expliciete bevestiging |
| `genereer_offerte_concept(project_id)` | Vult bestaande offerte-flow als concept |
| `schrijf_partner_uitvraag(project_id, partner_id)` | Concept partner-mail |

**Veiligheidsregel**: Claudia mag **lezen** zonder vragen, maar **schrijven/versturen** vereist altijd één klik bevestiging.

### c. Inline AI-suggesties per project

Onder "Volgende stap" een AI-blokje per project, gecached 15 min in `ai_project_suggestions`:

```text
🤖 Claudia denkt mee
- Klant heeft 6 dagen niet gereageerd op offerte → herinnering (concept klaar)
- Vliehors heeft prijs niet bevestigd, deadline 2 dagen → bel of mail
- Logies-offertes zijn binnen, klant kan kiezen → status-update naar klant
[Concept herinnering openen]   [Volledige overlegsessie]
```

### Implementatie technisch

- **Edge function** `supabase/functions/claudia-chat/index.ts` — streaming SSE via Lovable AI Gateway, tool-calling support, system prompt met bureau-context (positionering, tone of voice "u/je", business rules uit `app_settings`).
- **Edge function** `claudia-briefing/index.ts` — `pg_cron` op 3 momenten per dag, slaat briefing op in nieuwe tabel `ai_briefings` (één per dagdeel).
- **Edge function** `claudia-project-suggest/index.ts` — per project, cache 15 min in `ai_project_suggestions`.
- **Geen client-side prompts** — alle prompts in edge functions, beheerd via `/admin/instellingen/ai`.
- **Kosten/rate-limit**: 402/429 expliciet doorzetten naar UI met heldere toast. Dagcap per admin.

### Nieuwe tabellen

```sql
ai_briefings (
  id, dagdeel, generated_at, content jsonb, model_used, tokens_used
)
ai_project_suggestions (
  project_id, generated_at, suggestions jsonb, expires_at
)
ai_chat_conversations (
  id, admin_user_id, created_at, last_message_at, title
)
ai_chat_messages (
  id, conversation_id, role, content, tool_calls jsonb, created_at
)
```

Allemaal admin-only RLS (`is_admin(auth.uid())`).

## Aanpak in fases

**Fase 1 — Fundering**
- `getProject()` helper die programma + logies samenbrengt.
- `getProjectCommunicationState()` per spoor + overall.
- Route `/admin/werkbank` met twee tabs en split-view skeleton.
- Audit-document met alle plekken waar `program_type` en `provider_id="bureau"` workflow sturen.

**Fase 2 — Inbox + Claudia MVP**
- Werkitems-aggregator (todos + needs-action + onbeantwoorde chats), gededupliceerd op project.
- Quick views, dual-status-badges, inline acties.
- Bureau-acties als checklist-blok in detailpaneel.
- **Claudia chat-paneel MVP**: read-only tools (lijst, dossier lezen, samenvatten). Streaming SSE. Nog geen schrijfacties.

**Fase 3 — Projecten-tab + Detail-tabs + Claudia-acties**
- Projecten-tabel met dual-status-kolom, filter op type (combi / programma-only / logies-only).
- Detailpaneel-tabs (Overzicht · Programma · Logies · Financieel · Communicatie).
- Sidebar herstructureren, redirects van oude routes (`/admin/projecten`, `/admin/taken`, `/admin/dashboard`, `/admin/logies-aanvragen` → `/admin/werkbank`).
- **Claudia schrijftools**: concept-mail, taak aanmaken — altijd met bevestiging.

**Fase 4 — Bureau-rolfusie (code-vereenvoudiging)**
- `isBureauItem()` weg, bureau-acties expliciet als interne checklist.
- Partner-record `bureau` deactiveren in lijsten; queries filteren `id = 'bureau'`.
- `getItemSendPhase`, edge functions opschonen.

**Fase 5 — Eén projectmodel**
- `program_type` → `origin` als analytics-metadata.
- `program_type`-checks uit UI en edge functions.
- E-mail-templates samenvoegen.

**Fase 6 — Claudia-briefing & polish**
- `pg_cron` 3× per dag briefing genereren in `ai_briefings`.
- Inline suggesties cached in `ai_project_suggestions`.
- Daginstart-briefingkaart bovenin Werkbank.
- Keyboard shortcuts (j/k navigeren, e=mail, t=taak, x=klaar, /=Claudia).
- AI-instellingen-pagina (model-keuze, tijdstippen briefing, prompt-tweaks, dagcap).

## Wat blijft, wat gaat weg

| Onderdeel | Lot |
|-----------|-----|
| `AdminDashboard`, `AdminTodos`, `AdminProjects`, `AdminAccommodation`-overzicht | Samen → `/admin/werkbank` |
| `AdminAccommodationDetail` | Wordt embedded in Werkbank-detailpaneel als tab |
| `program_type` als workflow-driver | Wordt analytics-only metadata (`origin`) |
| Bureau-als-partner workflow | Vervangen door "bureau-actie" checklist intern |
| `isBureauItem()` helper | Verwijderd |
| Partner-record `bureau` (extern UI) | Niet meer zichtbaar in partner-lijsten |
| `block_type = "bureau"` in blocks | Blijft als leverancier-tag, geen workflow-impact |
| `accommodation_requests` / `accommodation_quotes` schema | Onveranderd — alleen UI verandert |
| `linked_program_id` / `linked_accommodation_id` | Centraal koppelpunt, blijft |
| Geen AI nu | + Claudia via Lovable AI Gateway |

## Risico's & open punten

- **AI-kosten**: cache strikt (briefing 3×/dag, suggesties 15 min, dagcap per admin). 402/429 surface naar UI met heldere toast.
- **Hallucinatie**: Claudia mag nooit zelfstandig versturen of statussen wijzigen. Alle schrijftools achter expliciete admin-klik.
- **Context-grootte**: dossiers kunnen lang worden — strip naar essentie (status, laatste 10 events, openstaande items, beide sporen) voor de prompt.
- **Logies-only reference**: behoud `LOG-` prefix om te voorkomen dat klanten denken dat hun logies-aanvraag een programma is.
- **Backwards-compat** voor URL's (oude `/admin/logies-aanvragen` → redirect naar Werkbank met logies-filter), e-mail-templates, partner-bureau financiële regels.
