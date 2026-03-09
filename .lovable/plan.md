

## CRM en Partners samenvoegen

### Huidige situatie

- **AdminCRM** (`/admin/crm`): Twee tabs — Klanten (unieke klanten uit program_requests) en Partners (simpele tabel met naam, contact, commissie, status, dropdown-acties)
- **AdminPartners** (`/admin/partners`): Uitgebreid partneroverzicht met onboarding stats, unavailability indicators, bulk invite, reset connections, checkboxes, type/commissie filters, actief-switch, etc.
- Sidebar heeft beide als aparte items: "CRM" en "Partners"

### Wat we gaan doen

1. **CRM wordt het gecombineerde overzicht** — De Partners-tab in AdminCRM wordt vervangen door de volledige AdminPartnersContent component (met alle bestaande functionaliteit: onboarding stats, bulk invite, unavailability, filters, etc.)

2. **Sidebar**: "Partners" verwijderen als apart item, alleen "CRM" behouden (met twee tabs: Klanten en Partners)

3. **Route `/admin/partners`** blijft werken als redirect naar `/admin/crm?tab=partners`. Detail-routes (`/admin/partners/:id`, `/admin/partners/nieuw`) blijven ongewijzigd.

### Technische wijzigingen

| Bestand | Wijziging |
|---|---|
| `src/pages/admin/AdminCRM.tsx` | Partners-tab vervangen door import van `AdminPartnersContent` uit AdminPartners. Klanten-tab behouden zoals nu. |
| `src/pages/admin/AdminPartners.tsx` | `AdminPartnersContent` exporteren als named export zodat CRM het kan importeren. |
| `src/components/admin/AdminLayout.tsx` | "Partners" verwijderen uit sidebar items |
| `src/App.tsx` | Route `/admin/partners` redirect naar `/admin/crm` (detail-routes behouden) |

De zoekbalk in CRM wordt per tab gescheiden — elke tab behoudt zijn eigen zoekfunctionaliteit.

