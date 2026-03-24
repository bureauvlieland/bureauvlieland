

## Plan: Operationeel Werkoverzicht — vooruitkijkend, intuitief, niet alleen afvinkbaar

### Wat je nu hebt vs. wat je wilt

**Nu**: Een takenlijst (AdminTodos) met checkboxes, gegroepeerd op type. Reactief — je ziet wat er al had moeten gebeuren, niet wat er aankomt.

**Gewenst**: Een vooruitkijkend tijdlijn-overzicht dat laat zien:
- Wat er de komende dagen/weken gaat gebeuren (termijnen, herinneringsmails, uitvoeringsdatums)
- Waar de actie ligt (bij jou, bij partner, bij klant)
- Wat dreigt uit te lopen
- Wanneer het systeem automatisch een herinnering stuurt

### Oplossing: "Werkoverzicht" — een nieuw dashboard-component

Een horizontale tijdlijn per project, gegroepeerd op urgentie, die alle aankomende events visualiseert:

```text
VANDAAG        +3d          +7d          +14d         +30d
  │              │            │             │            │
  ├─ Salure ─────┤            │             │            │
  │  🟠 2 items bij partner   │             │            │
  │  📧 herinnering over 1d   │             │            │
  │  📅 uitvoering 21 mei     │             │            │
  │              │            │             │            │
  ├─ Van Dijk ───┤            │             │            │
  │  🔴 offerte verloopt 6 apr│             │            │
  │  ⏳ klant moet reageren   │             │            │
  │              │            │             │            │
  ├─ RMD ────────┤            │             │            │
  │  🔴 offerte VERLOPEN (17 mrt!)          │            │
  │  📧 herinnering gestuurd 20 mrt         │            │
```

### Concrete implementatie

**1. Nieuw component: `src/components/admin/WorkOverview.tsx`**

Een card-based overzicht (geen Gantt, geen kalender — bewust simpel) met per actief project een compacte statusregel die toont:

- **Projectnaam + bedrijf** als header
- **Pipelinefase** als badge (concept / offerte verstuurd / akkoord / etc.)
- **Uitvoeringsdatum** — eerste geselecteerde datum
- **Dagen tot uitvoering** — countdown, rood als <14 dagen en nog niet alles bevestigd
- **Waar ligt de actie?** — icoon + label:
  - 🟠 "3 items wachten op partner" (status=pending, skip=false, geen quoted_at)
  - 🔵 "Offerte bij klant" (quote_status=offerte_verstuurd)
  - 🟢 "Alles bevestigd" (alle items confirmed)
  - 🔴 "Offerte verlopen" (quote_valid_until < vandaag)
  - ⚪ "Concept — nog niet verstuurd"
- **Volgende automatische actie** — berekend op basis van app_settings:
  - "Herinnering partner over X dagen" (als item >3d pending bij partner, nog geen herinnering gestuurd)
  - "Herinnering klant over X dagen" (als offerte >7d onbeantwoord)
  - "Herinnering al verstuurd op [datum]" (check email_log)
- **Verlopen termijnen** — rood gemarkeerd als quote_valid_until in het verleden ligt

**2. Data die wordt opgehaald (één query per sectie)**

- `program_requests` — actieve projecten met quote_status, selected_dates, quote_valid_until
- `program_request_items` — per project: status, provider_name, skip_partner_notification, updated_at, quoted_at
- `email_log` — recente herinneringsmails (type REMINDER_*) per project/item
- `accommodation_quotes` — logiesstatus per project
- `app_settings` — herinneringstermijnen (5d partner, 7d klant, 14d aanvraag)

**3. Sortering: urgentst bovenaan**

Projecten worden gesorteerd op een urgentiescore:
1. Verlopen termijnen (quote_valid_until < vandaag)
2. Uitvoeringsdatum <14 dagen + nog niet alles bevestigd
3. Items lang wachtend bij partner (>5 dagen)
4. Offerte lang onbeantwoord door klant (>7 dagen)
5. Rest op uitvoeringsdatum

**4. Integratie in AdminDashboard**

Vervangt de huidige `DashboardTodoWidget` niet — die blijft voor handmatige taken. Het Werkoverzicht komt als nieuw prominente card in de linker 2/3 kolom, boven of naast de LiveActivityFeed.

**5. Filter: tijdshorizon**

Toggle: "Komende 2 weken" / "Komende maand" / "Alle actieve projecten"

### Bugs die meteen meegaan

- `DashboardTodoWidget`: status filter `"open"` → `"todo"` (bestaande bug)
- `DashboardTodoWidget`: priority key `"medium"` → `"normal"` (bestaande bug)
- `autoTodoCreator.ts`: `accommodation_selected` type toevoegen aan config

### Bestanden

1. **Nieuw**: `src/components/admin/WorkOverview.tsx` — het volledige werkoverzicht
2. `src/pages/admin/AdminDashboard.tsx` — WorkOverview toevoegen aan layout
3. `src/components/admin/DashboardTodoWidget.tsx` — bugfixes (status + priority)
4. `src/lib/autoTodoCreator.ts` — ontbrekend `accommodation_selected` type

