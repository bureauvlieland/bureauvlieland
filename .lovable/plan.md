

## Plan: Klant-akkoord zichtbaar maken in admin overzicht

### Probleem
In de admin-detailpagina tonen items met status "confirmed" dezelfde badge, ongeacht of de klant al akkoord heeft gegeven. De Watertaxi (partner bevestigd, klant nog niet akkoord) en de 4x4 Terreinwagen (partner bevestigd, klant akkoord) zien er identiek uit.

### Oplossing
In de status-kolom van de items-tabel op `AdminRequestDetail.tsx` een visuele indicator toevoegen wanneer de klant akkoord heeft gegeven (`customer_accepted_at` of `customer_approved_at` is gezet).

**Wat verandert:**
- Items waar de klant akkoord heeft gegeven krijgen een extra groene badge/indicator "Klant akkoord" onder of naast de bestaande status-badge
- Items waar de klant nog geen akkoord heeft gegeven maar de partner wel heeft bevestigd, krijgen een subtiele amber-indicator "Wacht op klant" (alleen bij confirmed/alternative status)

Dit geldt voor zowel de quote-modus tabel als de reguliere tabel.

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/pages/admin/AdminRequestDetail.tsx` | Na de status-badge een "Klant akkoord" of "Wacht op klant" indicator tonen op basis van `customer_accepted_at` / `customer_approved_at` |

Eén bestand, kleine toevoeging in de status-cel van beide tabel-varianten (quote-modus en regulier).

