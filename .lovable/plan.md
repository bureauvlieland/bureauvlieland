

# Plan: Factuur-route en knop corrigeren

## Probleem
De factuur-preview route is alleen bereikbaar via `/admin/projecten/:id/factuur`, maar de projectdetailpagina wordt doorgaans benaderd via `/admin/aanvragen/:id`. De navigatie moet consistent zijn.

## Aanpak

### 1. Route toevoegen in `src/App.tsx`
- Extra route registreren: `/admin/aanvragen/:id/factuur` die naar dezelfde `AdminInvoicePreview` component verwijst
- De bestaande `/admin/projecten/:id/factuur` route blijft ook bestaan

### 2. `src/components/admin/FinancialOverviewCard.tsx`
- `requestId: string` prop toevoegen aan de interface
- `useNavigate` importeren
- "Factuur Maken" knop toevoegen (variant `outline`, icoon `FileText`)
- Navigeert naar `/admin/aanvragen/${requestId}/factuur` (consistent met het pad waar de gebruiker vandaan komt)
- Twee knoppen naast elkaar: "Factuur Maken" (outline) en "Factuur Registreren" (default)

### 3. `src/pages/admin/AdminRequestDetail.tsx`
- `requestId` (ofwel het `id` uit `useParams`) doorgeven aan `FinancialOverviewCard`

### Bestanden
- `src/App.tsx` -- extra route toevoegen
- `src/components/admin/FinancialOverviewCard.tsx` -- knop + requestId prop
- `src/pages/admin/AdminRequestDetail.tsx` -- requestId doorgeven
