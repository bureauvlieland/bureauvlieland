# Partner portal herstructurering

## Probleem
De huidige partner dashboard (cards "Actie vereist / Aankomend / Afgerond") klopt niet:
- Toont geannuleerde projecten (zoals BV-2604-0007)
- Toont al gefactureerde projecten als "actie vereist"
- Verbergt items die nog op klant-akkoord wachten — partner mag die wél zien
- Card-based status klopt niet meer met de echte workflow

Partner moet **dezelfde informatie** zien als de admin in zijn projectenlijst, plus een aparte werkbank-achtige weergave voor open acties.

## Doel
Twee weergaven in de partner portal:

1. **Projecten** (`/partner/dashboard` of `/partner/projecten`) — lijst zoals `AdminProjectsOverview`:
   - Eén rij per project (niet per item)
   - Kolommen: referentie, klant (afgeschermd: alleen bedrijfsnaam/voornaam), aankomstdatum, aantal personen, status (concept / in afstemming / akkoord / ingepland / gefactureerd), eigen rol in project (aantal items, status van die items)
   - Filters: zoeken, type, archief-toggle (geannuleerd/afgerond verbergen by default — exact zoals admin)
   - Klik → bestaande `/partner/project/:id` pagina
   - **Geannuleerde projecten verbergen** in default view, zichtbaar via archief-toggle

2. **Werkbank** (`/partner/werkbank`) — open acties, gegroepeerd per type:
   - **Beoordelen** — items met `status='pending'` (incl. items waar klant nog niet akkoord op is, maar partner wel mag zien)
   - **Wijzigingen** — items waarvan datum/aantal/prijs is veranderd na akkoord (nieuwe trigger uit Fase 1)
   - **Inplannen** — items `confirmed` zonder uitgevoerde datum
   - **Factureren** — items `executed` zonder factuur
   - Per regel: project-referentie, datum, item, knop "Open in project"

## Wijzigingen

### Data
- `get-partner-dashboard` edge function: alle items meegeven (ook `customer_approved_at IS NULL`), inclusief geannuleerde projecten met `cancelled_at` veld. Filtering gebeurt client-side zodat archief-toggle werkt.
- Status-derivatie per project (analoog aan `getDerivedStatus`): concept / in_afstemming / akkoord / ingepland / facturatie / afgerond / geannuleerd — vanuit partner-perspectief (eigen items, niet hele project).

### Nieuwe componenten
- `src/lib/getPartnerProjectsOverview.ts` — vergelijkbaar met `getProjectsOverview.ts` maar gefilterd op partner's items
- `src/components/partner-portal/PartnerProjectsTable.tsx` — lijst-component analoog aan `ProjectsListTable`
- `src/components/partner-portal/PartnerWerkbank.tsx` — gegroepeerde open-acties weergave
- `src/pages/PartnerProjecten.tsx` — vervangt overview op `PartnerDashboard.tsx`
- `src/pages/PartnerWerkbank.tsx` — nieuwe route

### Aanpassingen
- `PartnerDashboard.tsx` → wordt projecten-overzicht (tabel + zoek + archief-toggle)
- Navigatie in `PartnerPortal.tsx` / sidebar: "Projecten" + "Werkbank" als hoofdmenu
- Verwijder `PartnerProjectsList.tsx` card-weergave (vervangen door tabel)
- Geen wijzigingen aan `/partner/project/:id` zelf — die blijft de detailweergave

### Wat blijft
- Project-detailpagina (`PartnerProject.tsx`) — daar gebeuren acties (accept/decline/inplannen/factureren) per item
- `ProjectChatPanel`, `useProjectChat` — ongewijzigd
- Edge functions voor item-status updates — ongewijzigd

## Buiten scope
- Wijzigingsdetectie zelf (welke items "gewijzigd na akkoord" zijn) — gebruik bestaande velden; geen nieuwe DB-velden
- Geen aanpassingen aan admin-kant
- Geen aanpassingen aan emailtemplates

Ga ik door?
