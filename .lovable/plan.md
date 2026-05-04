
# Opschoning hangende voorstellen — actieplan per project

Negen projecten staan in `offerte_verstuurd` zonder klant-akkoord. Op basis van jouw input splitsen we ze in vier groepen.

## Groep A — Reeds handmatig afgehandeld via e-mail → admin doorzetten

Deze items zijn al door jou via mail rondgemaakt. We zetten ze administratief op akkoord en klaar voor uitvoering, zonder verdere mail naar klant of partners.

| Ref | Klant | Items |
|---|---|---|
| BV-2602-0002 | Artcadia / Margje van Spaendonck | 11 (alle pending) |
| BV-2604-0004 | OVM Partners B.V. | 13 (alle pending) |

**Acties per project:**
1. `program_requests`: `quote_status` → `definitief_bevestigd`, `terms_accepted_at` → `now()` (admin-override, met reden in `quote_personal_message`-notitie of `admin_notes`-equivalent), `customer_approved_at`-equivalent zetten.
2. `program_request_items` (alle niet-cancelled): `status` → `confirmed`, `customer_approved_at` → `now()`, `customer_accepted_at` → `now()`, `item_quote_status` → `bevestigd`, `skip_partner_notification` → `false` (anders blokkeert de status-guard trigger).
3. `program_request_history`: één INSERT per project met `action='admin_manual_completion'` en notitie *"Handmatig via e-mail afgehandeld in eerder stadium — administratief gelijkgetrokken."*
4. Geen e-mails uitsturen (geen email_log entries voor partner/klant — er gaat niets naar buiten).

## Groep B — Reminder na PDF-generatie

| Ref | Klant | Status |
|---|---|---|
| BV-2602-0004 | 4Dotnet / Jeannette van Spil | PDF ontbreekt |

**Acties:**
1. **Genereer** offerte-PDF via bestaande edge function (`generate-quote-pdf` of equivalent — ik check welke we hebben en roep hem aan met `request_id`). Resultaat opslaan in `program_requests.quote_pdf_path`. **Niet automatisch versturen.**
2. **Visuele QA** van de gegenereerde PDF (download → pdftoppm → inspectie eerste/laatste pagina).
3. **Reminder versturen** zodra PDF gecontroleerd is: gebruik bestaande `send-quote-email`-flow met `is_reminder=true` (of equivalent) richting klant. Formele 'u'-toon + low-threshold framing + link naar portaal + PDF-knop. Logregel in `email_log` zodat het automatische 5-daagse herinneringssysteem niet dubbel mailt.

## Groep C — Geen offerte nodig, alleen factuur

| Ref | Klant |
|---|---|
| BV-2603-0003 | Salure B.V. / Milou van der Zwaan (al `akkoord_ontvangen`) |

**Acties:**
1. **Sluit de openstaande admin-todo** *"Offerte-PDF ontbreekt"* die we eerder hebben aangemaakt voor dit project (status → `done`, met notitie *"Niet van toepassing — alleen facturatie volgt."*).
2. Geen PDF genereren. Eventueel `quote_status` op `definitief_bevestigd` zetten als project al richting facturatie loopt — ik check eerst de huidige `completion_status` en waar dit project staat in de pipeline voordat ik dit aanpas.

## Groep D — Relevantie nog te toetsen → admin-todos, géén actie

Deze projecten zijn ontstaan tijdens het ontwikkelproces; mogelijk niet meer relevant. Eerst peilen bij klant voordat we PDF genereren of reminden.

| Ref | Klant | Datum-event | PDF? |
|---|---|---|---|
| BV-2603-0007 | Maarten Bron | 29-31 mei 2026 | ✓ |
| BV-2603-0016 | Gemeente / Zelal Burunacik | 28-29 mei 2026 | ✓ |
| BV-2603-0018 | BENU / Sjoukje Wouda | 5 juni 2026 | ✓ |
| BV-2604-0003 | Kuiper Bouw / Sylvia Vet | apr **2028** | ✓ |
| BV-2604-0006 | Timmerfabriek de Houtmolen | 5 juni 2026 | ✓ |

**Acties:**
1. Per project een `admin_todos`-entry: *"Relevantie checken — voorstel hangt sinds {N} dagen zonder akkoord. Klant peilen of project nog actueel is, anders annuleren."* met `priority='normal'`, `auto_type='hanging_proposal_relevance_check'`, `auto_entity_id=request_id`, `due_date=today+3`.
2. Sluit (waar van toepassing) de eerder aangemaakte *"Offerte-PDF ontbreekt"*-todos voor deze projecten — die hadden ze al, dus daar hoeft niks meer mee.

## Volgorde en uitvoering

```
1. Groep A  — DB updates voor 0002 + 0004 (geen e-mail)
2. Groep C  — todo sluiten voor 2603-0003
3. Groep B  — PDF genereren voor 2602-0004 → QA → reminder versturen + email_log
4. Groep D  — 5 admin-todos aanmaken
5. Eindrapport: tabel met per project welke actie is uitgevoerd
```

## Technische punten om op te letten

- **Status-guard trigger** (`guard_item_status_consistency`): items mogen alleen op `confirmed` als `skip_partner_notification=false` óf `customer_approved_at` is gezet óf `item_quote_status='bevestigd'`. Voor groep A zetten we beide tegelijk; geen probleem.
- **`recalculate_program_completion_status`**: triggert automatisch bij item-mutaties; geen handmatige actie nodig voor `completion_status`.
- **Reminder-flow** voor groep B: ik check eerst welke edge-function bestaat (`send-quote-reminder` / `send-quote-email`) voordat ik de reminder afroep. Mogelijk moet ik de bestaande reminder-edge-function uitbreiden met een handmatige trigger; rapporteer ik terug voor ik wijzig.
- **PDF-generatie**: edge function aanroepen via `supabase--curl_edge_functions`; PDF wordt in storage bucket `quote-documents` opgeslagen. We versturen niet — alleen genereren en `quote_pdf_path` updaten.
- **Geen Mailjet calls in groep A** — strikt admin-only, geen partner of klant communicatie.

Laat me weten of dit klopt, dan ga ik aan de slag.
