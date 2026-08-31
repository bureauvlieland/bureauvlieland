# Geannuleerde aanvraag weer openen

## Situatie (gecontroleerd in de database)

BV-2606-0026 (Gerard van den Berg, 26 sep 2026, 8 pers.) staat op `cancelled`, geannuleerd op
25 aug 2026 15:02 met reden "geen reactie meer ontvangen". Alle 7 onderdelen staan op
`cancelled`, het project is gearchiveerd (`archived_at` gevuld). Offerte-status is
"offerte verstuurd", geldig tot 12 sep 2026. Er is geen logies-aanvraag gekoppeld.

Er bestaat nu wél een "heropenen" voor **afgeronde/gefactureerde** projecten
(`set-project-completion`), maar géén weg terug uit een **annulering**. Een annulering is dus
eenrichtingsverkeer — vandaar de vraag.

## Wat ik ga bouwen

Een herbruikbare "Aanvraag heropenen"-actie, precies daar waar nu de rode
"Aanvraag geannuleerd"-melding staat.

1. **Knop "Aanvraag heropenen"** in de rode melding, naast "Partners (alsnog) informeren".
2. **Bevestigingsvenster** met:
   - verplichte reden (wordt in de historie en op het project vastgelegd);
   - keuze of de onderdelen mee heropend worden (standaard: ja);
   - checkbox "offerte 14 dagen langer geldig maken" wanneer de geldigheidsdatum verstreken is
     (bij dit project 12 sep 2026 — nog geldig, dus alleen zichtbaar wanneer nodig);
   - duidelijke tekst dat er géén mail naar klant of partners uitgaat; de admin verstuurt
     daarna zelf de status-mail of offerte opnieuw.
3. **Bij heropenen** wordt het project weer actief: status terug naar actief, annuleringsvelden
   leeggemaakt, archivering opgeheven, onderdelen die op `cancelled` staan terug naar `pending`
   (al uitgevoerde/bevestigde onderdelen blijven ongemoeid), en — indien aanwezig — de
   gekoppelde logies-aanvraag weer op actief. Alles wordt gelogd in de projecthistorie en het
   admin-activiteitenlog, zodat zichtbaar blijft dat er heropend is en waarom.
4. **BV-2606-0026 direct heropenen** met deze nieuwe actie, zodat je er meteen mee verder kunt.

## Technisch

- Nieuwe edge function `reopen-program-request` (service role, admin-JWT-validatie in code,
  Zod-validatie op `requestId` + `reason` (min. 3 tekens) + `reopenItems` + `extendValidity`):
  - `program_requests`: `status='active'`, `cancelled_at=null`, `cancellation_reason=null`,
    `archived_at=null`, `reopened_reason=<reden>`, optioneel `quote_valid_until = today + 14d`.
  - `program_request_items`: `status='cancelled' → 'pending'` (alleen wanneer `reopenItems`),
    `status IN ('confirmed','executed')` blijft ongewijzigd. Let op de trigger
    `guard_item_status_consistency` — bij een blokkade wordt per item de reden teruggegeven.
  - Gekoppelde `accommodation_requests` (via `linked_accommodation_id`) terug van `cancelled`
    naar de open status; bijbehorende quotes blijven zoals ze zijn (partner moet opnieuw
    bevestigen).
  - Regel in `program_request_history` (`action='reopened'`) + `logAdminActivity`.
- Frontend: `ReopenRequestDialog.tsx` in `src/components/admin/`, aangeroepen vanuit de
  bestaande cancelled-melding in `AdminRequestDetail.tsx` (rond regel 1813); na succes
  `fetchRequestData()`.
- Tests: Deno-test op de edge function (OPTIONS/CORS, ontbrekende reden → 400) plus een
  vitest-guard dat de reopen-update de statusvelden leegmaakt en `confirmed`/`executed`
  onderdelen niet terugzet.

## Buiten scope

Geen automatische mails naar klant of partners bij heropenen; dat blijft een bewuste
admin-actie via "Stuur status-mail" / "Offerte opnieuw versturen".
