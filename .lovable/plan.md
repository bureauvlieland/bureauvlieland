

## Herinneringsmails voor Check 1 en Check 2

Twee herinneringsmails toevoegen aan `check-pending-items/index.ts`, zodat partners naast de admin-todo ook een e-mail ontvangen wanneer ze niet reageren.

### Wat verandert

**Bestand:** `supabase/functions/check-pending-items/index.ts`

#### Check 1 — Partner activiteit niet beantwoord (na 3 dagen)
Na het aanmaken van de admin-todo, een e-mail sturen naar de partner:
- Partner ophalen met `contact_email` en `email` (contact_email heeft voorrang)
- Deduplicatie via `email_log`: check of er al een `reminder_activity_pending` mail is gestuurd voor dit item — maximaal 1 herinnering per item
- Respecteer de `reminder_email_enabled` app_setting (al bestaand)
- Gebruik een DB-template `reminder_activity_pending` (met fallback-HTML)
- Variabelen: `partner_name`, `block_name`, `customer_name`, `days_since`, `portal_url`
- Log in `email_log` met type `reminder_activity_pending`

#### Check 2 — Partner logiesofferte niet beantwoord (na 5 dagen)
Zelfde patroon:
- Partner ophalen met `contact_email` en `email`
- Deduplicatie via `email_log`: check of er al een `reminder_quote_pending` mail is gestuurd voor deze quote — maximaal 1 herinnering per quote
- DB-template `reminder_quote_pending` (met fallback-HTML)
- Variabelen: `partner_name`, `customer_name`, `arrival_date`, `departure_date`, `number_of_guests`, `days_since`, `portal_url`
- Log in `email_log` met type `reminder_quote_pending`

#### Gedeelde logica
- `reminder_email_enabled` setting ophalen bij de bestaande settings-fetch (al aanwezig in `app_settings`)
- Mailjet-verzending volgt exact hetzelfde patroon als Check 5 (expired quotes) — dat werkt al betrouwbaar
- Partner query uitbreiden met `contact_email` veld voor juiste ontvanger

### Samenvatting

| Wijziging | Bestand |
|---|---|
| Herinneringsmail Check 1 + Check 2 | `supabase/functions/check-pending-items/index.ts` |

Geen nieuwe bestanden, geen database-migraties. Twee nieuwe e-mailtemplate-ID's (`reminder_activity_pending`, `reminder_quote_pending`) die optioneel via de admin-omgeving aangemaakt kunnen worden — de code bevat fallback-HTML.

