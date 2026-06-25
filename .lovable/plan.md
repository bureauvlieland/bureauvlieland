## Probleem
Claudia toont "Partnerreactie open" taken voor projecten waarvan de `completion_status` al `ready_for_invoice` is (zoals BV-2602-0002 en BV-2602-0005 in de screenshot). Die projecten zitten in de facturatiefase — partnerreactie-opvolging is dan niet meer relevant.

## Oorzaak
In `supabase/functions/_shared/projectActivity.ts` bevat `TERMINAL_COMPLETION_STATUSES` alleen `invoiced`, `completed`, `feedback_received`, `cancelled`. `ready_for_invoice` ontbreekt, dus signalen op die projecten worden niet onderdrukt in `claudia-daily-scan`.

## Fix
1. In `supabase/functions/_shared/projectActivity.ts`: voeg `ready_for_invoice` toe aan `TERMINAL_COMPLETION_STATUSES`. Vanaf "klaar voor facturatie" zijn partner-/klant-opvolgsignalen niet meer nuttig; alleen het facturatie-signaal zelf moet blijven (en dat is in `claudia-daily-scan` al expliciet uitgezonderd via `s.category !== "ready_for_invoice"`).
2. Geen UI-wijzigingen nodig — de kaart leest het resultaat van de scan.
3. De volgende daily scan (of een handmatige "Run nu") schoont de lijst op.

## Scope
Alleen 1 regel in 1 shared file. Geen schema- of UI-aanpassingen.
