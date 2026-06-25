## Doel
Claudia's aanbevelingen volgen dezelfde "rust & overzicht"-regels als de Werkbank Inbox: minder ruis, slimmer geclusterd, intuïtievere kaart.

## Probleem nu
- `claudia-daily-scan` haalt signalen op zonder rekening te houden met recent contact, snooze, of `completion_status` (`invoiced`/`completed`/`feedback_received`) — dus dezelfde signalen die we in de Werkbank al onderdrukken, komen via Claudia alsnog binnen.
- Geen cooldown: een project waar gisteren contact mee was levert toch een "partner reageert niet"-aanbeveling.
- UI groepeert puur op `priority`; meerdere aanbevelingen voor één project komen los te staan i.p.v. geclusterd per project.
- Geen verschil tussen hot/warm/cold projecten.

## Aanpak

### 1. Edge function `claudia-daily-scan` — signal-onderdrukking gelijktrekken met Werkbank
In `gatherSignals` per signaaltype dezelfde guards toepassen als in `getInbox.ts` / `check-pending-items`:

- **Projectfilter**: sluit projecten uit waar `completion_status in ('ready_for_invoice'… wel toelaten, maar 'invoiced','completed','feedback_received','cancelled')` of `program_requests.status in ('completed','cancelled')`.
  - Uitzondering: `ready_for_invoice` mag wel een signaal blijven (categorie 7).
- **Cooldown per project**: bepaal `lastContactAt` uit `project_communications` + `program_request_items.status_updated_at` (zelfde bron als `loadInbox`). 
  - `hot` (<3 dagen contact) → onderdruk niet-urgente signaaltypes (`partner_overdue`, `lodging_no_quotes`, `lodging_quote_unforwarded`, `todo_overdue` zonder harde deadline).
  - `warm` (<7 dagen) → onderdruk alleen `info`-achtige todo's.
  - `cold` → alles tonen.
- **Snooze**: respecteer `program_requests.snoozed_until > now()` (categorie features/project-snooze).
- Gedeelde helper hergebruiken: extraheer `shouldShowDuringCooldown` + `getProjectActivityState` uit `src/lib/projectActivity.ts` naar een Deno-compatibele module die de edge function importeert (of dupliceer minimaal in de edge function — eenvoudigste route, want geen build-pipeline tussen `src/` en `supabase/functions/`).

### 2. AI-prompt verfijnen
- Voeg expliciet toe dat signalen waar `last_contact_days < 3` bij staan **info-only** mogen zijn, niet urgent.
- Vraag de AI om aanbevelingen te clusteren: max 1 aanbeveling per project tenzij er financieel verschillende acties zijn.
- Signalen krijgen extra velden: `last_contact_days`, `cooldown` ("hot"/"warm"/"cold"), `completion_status`.

### 3. UI `ClaudiaRecommendationsCard.tsx` — slimmer & intuïtiever

- **Groeperen per project** (hetzelfde patroon als Werkbank Inbox): één rij per project, badges per onderliggende aanbeveling, met cooldown-pill ("3 dagen geleden contact").
- **Cross-entity aanbevelingen** (commissiefacturen, orphan todo's) blijven in een aparte sectie "Overig".
- **Sectie-volgorde**: `Urgent` → `Actie deze week` → `Overig / info`. Info-sectie standaard ingeklapt.
- **Lege staat**: "Alles in orde" tekst houden, maar toon laatste run + telling van onderdrukte signalen (`x signalen onderdrukt door recent contact`).
- **Per-rij snooze**: knop "Sluimer 3 dagen" naast Done/Dismiss; schrijft `dismissed_until` (nieuwe kolom of hergebruik `feedback_at` + `status='snoozed'`). Voor scope nu: alleen `status='dismissed'` met expliciete toast "weer zichtbaar bij volgende run als nog steeds relevant" — geen schemawijziging.
- **Badge-teller in `ClaudiaBadge`**: telling sluit `info` uit zodat sidebar niet rood is om niet-urgente signalen.

### 4. Tests
- Unit tests voor de gedeelde cooldown-helper (al aanwezig in `projectActivity.test.ts`) uitbreiden met scenario's specifiek voor Claudia (snooze + completion_status).
- Geen edge function tests (geen runner) — wel handmatige run-knop voor verificatie.

## Technisch overzicht (bestanden)
- `supabase/functions/claudia-daily-scan/index.ts`: filters per signal-categorie, lastContact-lookup, extra velden in `Signal`, prompt update.
- `supabase/functions/_shared/projectActivity.ts` *(nieuw)*: Deno-port van `getProjectActivityState` + `shouldShowDuringCooldown`.
- `src/lib/projectActivity.ts`: ongewijzigd (frontend), eventueel constante export delen.
- `src/components/admin/werkbank/ClaudiaRecommendationsCard.tsx`: groeperen per project, cooldown-pill, ingeklapte info-sectie, "Onderdrukt"-teller in header.
- `src/components/admin/ClaudiaBadge.tsx`: `total` filteren op `priority != 'info'`.
- `src/lib/__tests__/projectActivity.test.ts`: extra cases.

## Niet in scope
- Geen schemawijziging op `admin_recommendations` (snooze-veld).
- Geen wijziging aan cron-frequentie.
