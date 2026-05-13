## Probleem

De annuleringsmail naar partners (verstuurd vanuit `cancel-program-request`) toont:
- "Klant: Bureau Vlieland" voor élke aanvraag (i.p.v. de echte klant)
- Lege "Jouw activiteit(en)" en lege datums

Twee oorzaken in `supabase/functions/cancel-program-request/index.ts` rond regel 270–306.

## Oorzaak 1 — hardcoded klantnaam
```ts
customer_name: "Bureau Vlieland",
company_name: "",
```
De code negeert `program.customer_name` / `program.customer_company`.

## Oorzaak 2 — variabelen matchen de DB-template niet
DB-template "Annulering (Partner)" verwacht:
- `{{customer_name}}`, `{{company_name}}`
- `{{event_dates}}`
- `{{cancelled_items}}` (HTML lijst)
- `{{activity_name}}` (subject)
- `{{cancellation_reason}}`

De code stuurt daarentegen `dates`, `activities_list` en geen `activity_name`. Daardoor blijven velden leeg.

## Fix

In `cancel-program-request/index.ts` de `templateVariables` voor de partner-loop aanpassen naar (centrale belofte: privacy-rules respecteren — bedrijfsnaam tonen waar beschikbaar, anders contactnaam):

```ts
const customerLabel = program.customer_company || program.customer_name || "";
const templateVariables = {
  partner_name: sanitizeHtml(provider.name),
  customer_name: sanitizeHtml(customerLabel),
  company_name: sanitizeHtml(program.customer_company || ""),
  reference_number: program.reference_number || "",
  event_dates: dates,            // was: dates
  dates: dates,                  // backwards-compat voor fallback HTML
  cancellation_reason: reason ? sanitizeHtml(reason) : "",
  cancelled_items: provider.items
    .map((item) => `<p style="margin: 5px 0;">• ${sanitizeHtml(item)}</p>`)
    .join(""),                   // was: activities_list
  activities_list: provider.items.map((i) => `<li>${sanitizeHtml(i)}</li>`).join(""),
  activity_name: sanitizeHtml(provider.items[0] || "aanvraag"),  // voor subject
};
```

Daarmee zijn klantnaam, activiteit én datum gevuld in de templated mail én blijft de hardcoded fallback-HTML óók werken.

## Privacy-check
Volgens de geldende privacy-regel mogen partners de klantnaam (bedrijfsnaam preferred) zien — alleen contactgegevens (e-mail/telefoon/adres) blijven afgeschermd. Klantnaam tonen is dus correct en gewenst.

## Verificatie
1. Edge function deployen.
2. Testproject annuleren via admin → controleren dat mail in test-mode (rerouted) zowel klantnaam, datum als activiteit toont.
3. `email_log` rij inspecteren (bestaande logging blijft ongewijzigd).

Geen DB-migratie nodig; alleen edge function aanpassen.
