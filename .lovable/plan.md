

## Heroverweging statussen, todo-logica en presentatie

Een holistische opschoning van wat de afgelopen iteraties is gegroeid. Drie kernproblemen, één gefocust verbeterpakket.

---

### Probleem 1 — Statussen zijn versnipperd, labels verschillen per scherm

In de codebase leven momenteel **vijf** parallelle status-systemen die elkaar overlappen, met soms andere labels per portaal:

| Systeem | Waar | Voorbeeld waarden |
|---|---|---|
| `program_requests.quote_status` | project-niveau | concept, in_afstemming, offerte_verstuurd, akkoord_ontvangen, definitief_bevestigd |
| `program_request_items.status` | item ruwe DB-status | pending, confirmed, accepted, alternative, counter_proposed, … |
| `program_request_items.item_quote_status` | item-quote-status | concept, in_afstemming, bevestigd, optioneel |
| `getItemSendPhase()` (afgeleid) | admin "wat moet ik nu doen" | wacht_op_klant, klaar_voor_partner, verstuurd |
| `getProjectPipelineStage()` | dashboard funnel | concept → offerte_verstuurd → akkoord → av_getekend → facturatie → afgerond |

Daarnaast labelen `PartnerItemRow`, `PartnerUnifiedList` en `StatusSummary` dezelfde onderliggende status anders ("Wacht op klant", "Voorstel verstuurd", "Onder voorbehoud"). Voor jezelf is onduidelijk wélke status leidend is.

**Aanpak: één semantisch lifecycle-model + één centrale label-map**

Nieuwe file `src/lib/lifecycle.ts` die alle bestaande velden samen leest en per item én project één van deze **canonical phases** teruggeeft, met per doelgroep (admin / klant / partner) een vaste label:

**Project lifecycle (7 fases, gebaseerd op bestaande pipeline):**
`concept` → `klant_actie_offerte` → `klant_actie_voorwaarden` → `partners_benaderen` → `partners_wachten` → `uitvoering` → `facturatie` → `afgerond` (+ `geannuleerd`).

**Item lifecycle (6 fases):**
`concept` (nog niets verstuurd) → `wacht_klant` (offerte verstuurd, geen akkoord) → `wacht_partner` (klant akkoord, partner moet reageren) → `bevestigd` → `uitgevoerd` → `gefactureerd` (+ `geannuleerd`, + `tegenvoorstel_klant`, + `niet_beschikbaar`).

Eén central config-object `lifecycleConfig[phase] = { adminLabel, customerLabel, partnerLabel, color, icon, description, nextAction }` dat al bestaande badge-componenten gaan hergebruiken. Elke andere status-map (`itemStatusConfig`, `quoteStatusConfig`, partner-portal mappings) verwijst hier naartoe in plaats van eigen labels te definiëren.

**UI-impact (klein, omdat alle badges al via config-maps werken):**
- `ItemStatusBadge`, `AdminQuoteStatusBadge`, `StatusSummary` (checklist-variant), `PipelineFunnel`, `PartnerItemRow`, `PartnerUnifiedList` lezen voortaan uit `lifecycleConfig`.
- Admin-projectpagina krijgt **één duidelijke "Volgende stap"-banner** bovenaan (vervangt de losse "Waiting for customer"-banner) die direct `lifecycleConfig[phase].nextAction` toont met een primaire knop.

---

### Probleem 2 — Todo-titels verouderen

Voorbeelden uit `check-pending-items`:
- *"Aanvraag X is **5 dagen** inactief"* — over 3 dagen staat dezelfde todo nog open, maar de titel zegt nog steeds "5 dagen".
- *"X heeft sinds **5 dagen** geen update ontvangen"* — idem.
- *"Offerte X verloopt over **3 dagen**"* — wordt achterhaald bij elke dagcheck.

**Aanpak: titels worden tijdsneutraal, leeftijd wordt afgeleid en live getoond**

1. **Titels herschrijven naar tijdsneutraal** in `check-pending-items/index.ts`:
   - `"Aanvraag {customer} is inactief"` (zonder dag-aantal)
   - `"{customer} heeft nog geen akkoord op offerte"`
   - `"{customer} heeft geen recente status-update ontvangen"`
   - `"Offerte {customer} verloopt binnenkort"`
   - Beschrijving krijgt wél een dag-getal, maar prefix zoals: *"Stand bij aanmaken: 5 dagen open. Zie kaart voor actuele leeftijd."*

2. **Live "leeftijd" tonen in de admin-todo lijst** (`AdminTodos.tsx`):
   - Nieuwe kolom / chip die `formatDistanceToNow(todo.created_at)` toont ("3 dagen geleden aangemaakt").
   - Voor todo's met een onderliggend tijdsveld (bv. `quote_sent_at` voor `customer_status_email_due`, `valid_until` voor `quote_expiring_soon`) een tweede chip met de échte business-leeftijd: *"Offerte staat 8 dagen open"* / *"Verloopt over 1 dag"*.
   - Deze chips worden client-side gerenderd dus altijd actueel.

3. **Auto-refresh van de live-leeftijd**: een `setInterval` van 60 seconden in de todo-lijst om de chips te hertekenen, zodat het scherm "meegroeit" zonder reload.

4. **Auto-update van priority** in cleanup-functie: voor `customer_status_email_due` en `customer_status_update_due`, indien ouder dan `2× threshold`, automatisch upgraden naar `high` (gebeurt in cleanup-stale-todos). Zo zie je escalatie zonder dat je elke morgen handmatig de oude todo's moet opnieuw maken.

---

### Probleem 3 — Cleanup mist gevallen, todo's blijven hangen

Concreet ontdekt:
- `customer_status_email_due` wordt pas opgelost als de klant akkoord geeft of het project geannuleerd wordt — maar **niet** wanneer jij gewoon de status-mail verstuurt. Resultaat: morgen staat dezelfde todo er nog.
- `customer_status_update_due` checkt op een outbound mail ná `todo.created_at`, maar als jij vandaag bovenop een 4 dagen oude todo een mail stuurt, blijft de todo onnodig "hoog" staan.
- `request_no_response` wordt geactiveerd op `program_requests.updated_at` — dat veld muteert bij élke admin-edit (notitie, prijs aanpassen) waardoor de teller telkens reset; tegelijk wordt de todo niet opgeruimd na een verstuurde mail.

**Aanpak: cleanup-rules uitbreiden + dedicated email-trigger**

1. **`customer_status_email_due` opruimen na verzending status-mail**
   In `cleanup-stale-todos`: ook resolven als er een `email_log`-record bestaat met `email_type IN ('project_status_update', 'project_email')` voor deze `related_request_id` na `todo.created_at`.

2. **`customer_status_update_due` met "snooze 5 dagen" na elke verstuurde mail**
   Wanneer een outbound mail wordt gelogd, de todo niet alleen sluiten maar ook *vervangen* door een nieuwe wachttijd: cleanup-functie sluit de oude todo en `check-pending-items` mag pas weer een nieuwe maken zodra opnieuw `customer_status_email_stale_days` voorbij is sinds die mail. Deze logica zit al impliciet in stap 1; expliciet checken we in `check-pending-items` dat de **laatste** outbound mail-datum (i.p.v. todo-created-at) als ankerpunt wordt gebruikt voor de drempel.

3. **`request_no_response` ankeren op laatste klant-/partner-interactie i.p.v. `updated_at`**
   Vervangen door `MAX(quote_sent_at, last_outbound_mail_at, last_inbound_mail_at, last_history_actor='customer'_at)`. Zo telt admin-bewerkingen niet als "activiteit van/naar de klant".

4. **Generieke "stale dedup" cleanup-regel**
   Eén nieuwe regel die voor élk `auto_type` met `auto_entity_id = related_request_id`: als er twee open todo's met hetzelfde type en dezelfde request_id zijn, sluit de oudste. Beschermt tegen alle toekomstige race-conditions.

5. **Snooze-dropdown met preset-waarden in admin-todo lijst**: 1 dag / 3 dagen / 1 week. (Veld `snoozed_until` bestaat al; alleen UI-knoppen toevoegen naast de bestaande date-picker.) Bij gefilterde view "Actief" worden gesnoozede todo's verborgen tot `snoozed_until <= today`.

---

### Acceptatiecriteria

- Op één scherm (admin-projectdetail) zie je in één blik: "Volgende stap is Y" + één primaire knop. Geen tweetal banners meer voor dezelfde toestand.
- Iedere statusbadge in admin-, klant- én partner-portaal komt uit `lifecycleConfig` en gebruikt dezelfde kleur/icoon voor dezelfde semantische fase.
- Een todo die gisteren werd aangemaakt toont vandaag automatisch "1 dag geleden", zonder verstrengelde getallen in de titel.
- Na het versturen van een status-mail verdwijnt de bijbehorende todo binnen één cron-cycle (max 24u), of direct als de admin op "Markeer als opgelost" klikt.
- Geen dubbele open todo's met hetzelfde `auto_type + related_request_id`.

### Buiten scope

- Geen wijziging aan de DB-schema's (geen nieuwe enums of kolommen) — alleen afgeleide TypeScript-types en cleanup-logica.
- Partner-portaal status-badges krijgen dezelfde labels en kleuren, maar geen nieuwe acties of flow-veranderingen.
- Geen wijziging aan de status-mail-content (in vorige iteratie al fase-bewust gemaakt).
- Geen volledig nieuwe todo-types (Laag-2 automatische klant-mails blijft ongewijzigd uit).

### Volgorde van uitvoeren

1. `lifecycle.ts` + alle config-maps verwijzen ernaar (niet-brekend, badges blijven werken).
2. `AdminRequestDetail` "Volgende stap"-banner consolideren.
3. `check-pending-items` titels tijdsneutraal + nieuwe ankerpunt-logica voor `request_no_response`.
4. `cleanup-stale-todos` uitbreiden met de drie nieuwe regels.
5. `AdminTodos` lijst: live-leeftijd-chips + snooze presets + auto-refresh.

