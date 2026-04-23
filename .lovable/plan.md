

## Status-mail verplaatsen + slimmer afgestemd op huidige stand

### Probleem
Op de admin-projectpagina staat de knop **"Status update e-mail"** tussen de programma-actieknoppen, terwijl alle communicatie-acties op het tabblad **Communicatie** thuishoren. Daarnaast is de huidige tekst statisch: hij vermeldt enkel hoeveel onderdelen "in afwachting" zijn, terwijl in het screenshot de offerte wél is verstuurd maar de klant nog geen akkoord heeft gegeven — het bericht moet dán focussen op de actie van de klant (akkoord op offerte, voorwaarden, logies-keuze, facturatiegegevens).

### Wijzigingen

**1. Knop verplaatsen (UI)**
- **`src/pages/admin/AdminRequestDetail.tsx`** — knop "Status update e-mail" weghalen uit de programma-toolbar (rond regel 1374-1379).
- De `SendProjectEmailSheet` zelf en de `statusEmailOpen` state laten staan (wordt nog steeds gebruikt voor de pre-fill).
- Een nieuwe handler `handleOpenStatusEmail` (gewoon `setStatusEmailOpen(true)`) doorgeven aan `ProjectCommunicationsCard` via een nieuwe prop `onOpenStatusEmail`, zodat de bestaande sheet met de slimme template-content opent vanuit het Communicatie-tabblad.

**2. Communicatie-card uitbreiden**
- **`src/components/admin/ProjectCommunicationsCard.tsx`** — naast de huidige knoppen "E-mail" en "Loggen" een derde primaire knop **"Status update"** (icoon `Sparkles` of `RefreshCw`) toevoegen die de status-mail opent met de slim-gegenereerde inhoud. Knop alleen tonen als `onOpenStatusEmail` prop is meegegeven (dus niet op logies-detail, waar nog geen status-template is).

**3. Slimmere statusmail-content**
Functie `generateProgramStatusEmailBody` in `AdminRequestDetail.tsx` herschrijven met een **fase-bewuste opbouw**, gebaseerd op `request.quote_status`, `customer_approved_at` per item, `terms_accepted_at`, `billing_company_name` en de logies-status. De fasen:

| Fase | Trigger | Toon van de mail |
|---|---|---|
| **A. Concept** | `quote_status` = `concept` of leeg, niets verstuurd | "We werken uw programma uit, geen actie nodig." |
| **B. Offerte verstuurd, wacht op klant** ⬅ huidige situatie in screenshot | `quote_status = offerte_verstuurd` en geen `customer_approved_at` op items | **Hoofdboodschap: "We wachten op uw akkoord."** Geen partner-status tonen (want nog niets verstuurd), wél: openstaande offerte-link, voorwaarden, facturatie, logies-keuze. |
| **C. Akkoord ontvangen, partners benaderd** | items met `customer_approved_at` én `skip_partner_notification = false` | Per-onderdeel partnerstatus tonen (huidige logica: bevestigd/alternatief/niet beschikbaar/in afwachting). |
| **D. Definitief** | `quote_status = definitief_bevestigd` en alles confirmed | Korte bevestiging + verwijzing naar programma-overzicht. |

**Wat verandert concreet in de tekst**:
- Begintekst (intro) wordt fase-afhankelijk in plaats van altijd "stand van zaken".
- Per-onderdeel partnerstatus-blok (✅/❌/🔄/⏳) wordt **alleen getoond in fase C en D** (anders misleidend, want niets is naar partners gestuurd).
- "Wat we nog van u nodig hebben"-blok wordt **prominenter** in fase A en B (bovenaan, met duidelijke call-to-action en rechtstreekse link naar het portaal).
- Onderwerpregel past zich aan: 
  - Fase B → `"Uw offerte staat klaar — graag uw akkoord (BV-XXXX)"`
  - Fase C → `"Status update programma BV-XXXX"`
  - Fase D → `"Programma definitief bevestigd — BV-XXXX"`

### Acceptatiecriteria
- Knop "Status update e-mail" verschijnt niet meer tussen de programma-knoppen, wél als primaire knop in de Communicatie-card.
- In het scenario van het screenshot (offerte verstuurd, geen klant-akkoord) opent de mail met als hoofdboodschap dat de klant akkoord moet geven, **zonder** misleidende "10 in afwachting"-regel.
- Zodra een klant akkoord heeft gegeven en partners zijn benaderd, toont dezelfde knop de huidige per-partner statusmail.
- Onderwerpregel komt overeen met de fase.
- Geen wijziging aan `SendProjectEmailSheet` — alleen de pre-fill (`defaultSubject` / `defaultBody`) is aangepast.

### Niet in scope
- Geen wijziging aan logies-status-mail (`AdminAccommodationDetail`).
- Geen wijziging aan de daadwerkelijke verzendlogica of e-maillogging.
- Geen aanpassing aan `email_templates`-tabel (deze mail wordt vrij gegenereerd als project-e-mail, niet vanuit een opgeslagen template).

