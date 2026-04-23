

## Mijn advies: niet volledig automatisch, wel slim getriggerd

### Korte afweging

Volledig automatisch elke X dagen status-mailen heeft serieuze nadelen voor jullie soort werk:

- **Bureau Vlieland is geen massaproces** — elk programma is maatwerk en de toon hoort persoonlijk te blijven. Een wekelijkse "robot-update" botst met de formele, persoonlijke stijl die jullie hanteren.
- **Risico op ruis**: in fase B (wachten op klant-akkoord) is een herinnering nuttig, maar in fase C (partners benaderd) zou een automatische mail kunnen vertellen "10 in afwachting" terwijl jullie net een uur eerder telefonisch met de klant spraken.
- **E-mailmoeheid**: klanten die te vaak status-updates krijgen, gaan ze negeren — juist als er écht actie nodig is.
- **Reputatierisico**: een fout in de fase-logica = 50 klanten tegelijk een verkeerd bericht.

### Wat ik wél aanraad: **trigger-gebaseerd + admin houdt de regie**

Mijn voorstel is een **hybride model** in drie lagen, oplopend van "veilig" naar "automatisch":

---

### Laag 1 — Slimme herinneringen via admin-todo's (aanbevolen, snel te bouwen)

Geen automatische mails naar klanten, maar wel automatische **herinneringen aan jullie** via het bestaande `admin_todos` systeem (zoals nu ook al gebeurt voor partner-reminders). Concreet:

- **Trigger A**: Offerte staat 5 dagen verstuurd zonder klant-akkoord → admin-todo *"Klant X heeft nog geen akkoord gegeven — overweeg status-mail te sturen"* met directe link naar de status-mail-knop.
- **Trigger B**: 3 dagen na laatste partner-bevestiging zonder vervolg-update → admin-todo *"Programma Y heeft sinds 3 dagen geen update — stuur status-mail"*.
- **Trigger C**: Voorwaarden/facturatie/logies-keuze ontbreken bij naderende uitvoeringsdatum (T-14 dagen) → admin-todo *"Klant X mist nog: voorwaarden + logieskeuze"*.

Drempels (5, 3, 14) komen uit `app_settings` zodat jullie ze kunnen bijstellen.

**Voordeel**: jullie behouden volledige controle, kunnen de tekst nog tweaken, of besluiten te bellen i.p.v. mailen. De infrastructuur (`check-pending-items` edge function + `app_settings`-toggles) bestaat al.

---

### Laag 2 — Eén automatische "zachte" reminder in fase B (optioneel, opt-in per project)

Eén gerichte uitzondering: als een offerte na **N dagen** (instelbaar, bv. 5) nog geen akkoord heeft, mag het systeem **één keer** automatisch de fase-B status-mail versturen. 

- Per project een toggle `auto_status_reminder_enabled` (default: aan, maar handmatig uitzetbaar per project).
- Maximaal **1× per project** — daarna pakt laag 1 het op via een admin-todo.
- Logging in `email_log` met `email_type: "auto_status_reminder_phase_b"` zodat jullie in het Communicatie-dossier precies zien dat dit automatisch ging.
- Globale kill-switch in `app_settings` (`auto_status_email_enabled`) zodat jullie het in één klik kunnen uitzetten.

---

### Laag 3 — Volledig automatisch (mijn advies: NIET doen)

Periodieke automatische status-mails in fase C of D raad ik af. In fase C verandert de informatie continu (partners reageren los), waardoor automatische mails snel verouderd zijn. In fase D is het programma af — geen status nodig.

---

### Concreet implementatievoorstel

**Aanbeveling**: start met **Laag 1** (trigger-gebaseerde admin-todo's). Dat geeft jullie 80% van de waarde zonder enig risico. Als jullie na een paar weken zien dat een specifieke trigger altijd leidt tot dezelfde mail-actie, kunnen we Laag 2 voor díe trigger aanzetten.

#### Wijzigingen voor Laag 1

1. **`supabase/functions/check-pending-items/index.ts`** uitbreiden met drie nieuwe checks:
   - `customer_quote_pending` — `quote_status = offerte_verstuurd` + `> N dagen` + geen `customer_approved_at` op items → admin-todo `auto_type: "customer_status_email_due"`.
   - `customer_status_stale` — laatste outbound mail > 5 dagen geleden + fase C met openstaande items → admin-todo `auto_type: "customer_status_update_due"`.
   - `customer_missing_inputs_near_event` — uitvoeringsdatum < 14 dagen + voorwaarden/facturatie/logies ontbreken → admin-todo `auto_type: "customer_inputs_missing"`.

2. **`app_settings`** uitbreiden met:
   - `customer_status_email_pending_days` (default 5)
   - `customer_status_email_stale_days` (default 5)
   - `customer_inputs_warning_days` (default 14)

3. **Admin-todo UI** — bestaande todo-lijst krijgt automatisch deze nieuwe types; bij klikken landt admin op de project-pagina met de juiste tab open. Bij `customer_status_email_due` direct de "Status update"-knop highlighten in de Communicatie-card (bv. via `?action=status-email` query-param).

4. **`cleanup-stale-todos`** uitbreiden zodat deze drie nieuwe types automatisch resolven zodra de onderliggende voorwaarde is opgelost (klant geeft akkoord / mail is verstuurd / voorwaarden ingevuld).

### Wat dit oplevert

- Geen enkele automatische klant-mail (nul risico op verkeerde communicatie).
- Jullie krijgen op het juiste moment een "tik op de schouder" met één klik door naar de juiste actie.
- Hergebruikt 100% van de bestaande infrastructuur (cron, todos, app_settings, status-mail-knop).
- Laag 2 is later in 1-2 uur toe te voegen als jullie comfortabel zijn met de triggers.

### Niet in scope

- Geen wijziging aan de status-mail-tekst zelf (die is in vorige iteratie al fase-bewust gemaakt).
- Geen wijziging aan partner-reminders (die werken al goed).
- Geen extra UI buiten de bestaande todo-lijst.

### Vraag aan jou

Wil je dat ik begin met **alleen Laag 1** (admin-todo triggers, jij blijft de mail handmatig versturen), of meteen ook **Laag 2** voor de fase-B reminder erbij (1× automatisch akkoord-herinnering na 5 dagen)?

