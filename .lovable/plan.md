## Wat er nu mis gaat

De werkbank-status "Stilte — opvolgen" wordt afgeleid uit `program_requests.updated_at` (gebruikt als proxy voor *last_outbound_at*) met een drempel van **5 dagen**. Zie `src/lib/projectCommunication.ts` (constante `STILTE_DRIEMPEL_DAGEN = 5`) en `src/lib/getProject.ts` regel 200/211:

```ts
last_outbound_at: p.updated_at,
```

Het probleem: een verstuurde **Status update** / **Mail klant** / **Mail partner** wordt wel in `email_log` weggeschreven, maar **raakt de `program_requests`-rij niet aan**. Daardoor verandert `updated_at` niet en blijft het project op rood staan, ook al ging er gisteren een mail uit. Hetzelfde geldt voor het logies-spoor (`lodging_requests.updated_at`).

Er is op dit moment **geen snooze op projectniveau** — alleen op losse todo's (`admin_todos.snoozed_until`). De Inbox toont een project zodra `comm === "bij_bureau"` of `"stilte"`, zonder ontsnappingsmogelijkheid.

## Voorstel

### 1. Echte "laatste uitgaande communicatie" gebruiken (de hoofdfix)

In `listProjectsForWerkbank` ophalen: per project (en per lodging request) het `MAX(created_at)` uit `email_log` waar `direction = 'outbound'` (of een gelijkwaardig filter dat we al gebruiken). Die waarde gebruiken als `last_outbound_at` voor `getProgramCommunicationState` / `getLodgingCommunicationState`, met fallback naar `updated_at` als er nog niets gemaild is.

Effect: zodra je gisteren mailt, gaat de teller terug naar 1 dag en verdwijnt "Stilte" automatisch tot je weer 5 dagen niets hoort.

Drempel `STILTE_DRIEMPEL_DAGEN = 5` blijft staan (consistent met de bestaande memory "Silence=Agreement na 7 dagen" — die 7 gaat over juridische silence-agreement, niet over de werkbank-kleur; 5 voor opvolgen blijft logisch).

### 2. Optionele project-snooze in de werkbank

Voor situaties waarin je net telefonisch contact had of bewust wilt wachten zonder mail te sturen:

- Veld `snoozed_until date` toevoegen aan `program_requests` (en `lodging_requests`), via migration met de gebruikelijke GRANT/RLS-discipline.
- In `loadInbox` (`src/lib/getInbox.ts`) projecten met `snoozed_until > today` overslaan in de communicatie-driven loop (todos blijven via hun eigen snooze-logica werken).
- Knop "Snooze" in `ProjectDetailPanel` werkbank-header → popover met snelle opties (1 dag / 3 dagen / 1 week / aangepast), zelfde patroon als de bestaande `TodoSnoozeChip`.
- Snooze-chip tonen op de projectkaart en in detail, met "Wakker maken" om te herstellen.

### 3. Visuele consistentie

- Stilte-chip krijgt tooltip "X dagen geen contact (laatste mail: …)" zodat duidelijk is waarom een project rood is.

## Technische details

**Bestanden:**

- `src/lib/getProject.ts` — extra select naar `email_log` (group by `request_id` / `accommodation_request_id`) en doorgeven aan `getProgram/LodgingCommunicationState`.
- `src/lib/projectCommunication.ts` — geen wijzigingen aan de logica, evt. extra veld `lastOutboundReason` voor tooltip.
- `src/lib/getInbox.ts` — snooze-filter op projectniveau.
- `supabase/migrations/…` — `snoozed_until date null` op `program_requests` en `lodging_requests` + GRANT-blok.
- `src/components/admin/werkbank/ProjectDetailPanel.tsx` + `InboxList.tsx` — snooze-knop en -chip.

**Out of scope:** wijziging van de 7-daagse silence-agreement workflow, AV/akkoord-logica, of partner-portal weergave.

## Open vraag

Wil je **alleen de fix** (punt 1 — werkbank reageert eindelijk correct op verstuurde mails), of ook **de project-snoozeknop** (punten 1+2)?

punt 1

&nbsp;