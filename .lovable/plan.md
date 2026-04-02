

## Plan: E-mailnotificatie naar admin bij indienen logiesofferte

### Huidige situatie
Wanneer een partner een logiesofferte indient, wordt er een `admin_todo` aangemaakt via de `create-quote-review-todo` edge function. Er wordt echter geen e-mail naar de admin gestuurd.

### Aanpak
De `create-quote-review-todo` edge function uitbreiden met een Mailjet e-mail naar de admin (erwin@bureauvlieland.nl) zodra een nieuwe offerte binnenkomt.

### Wijzigingen

**1. `supabase/functions/create-quote-review-todo/index.ts`**

Na het succesvol aanmaken van de todo, een e-mail versturen via Mailjet:
- Ophalen van de `accommodation_quote_notification_admin` template uit `email_templates` (via `getRenderedTemplate`)
- Indien template niet bestaat: eenvoudige fallback-HTML met partnernaam, accommodatienaam, prijs en link naar admin-detailpagina
- Ontvanger: erwin@bureauvlieland.nl (of via app_settings)
- Dezelfde test-mode logica als overige functies (in testomgeving naar erwin@bureauvlieland.nl)
- E-mail loggen in `email_log`

Template-variabelen:
- `partner_name` — naam van de partner
- `accommodation_name` — naam van de accommodatie
- `customer_name` — klant/bedrijfsnaam
- `reference_number` — referentie
- `price_total` — totaalprijs
- `admin_url` — directe link naar de logiesdetailpagina in admin

**2. Database: e-mailtemplate aanmaken (optioneel)**

Een `accommodation_quote_notification_admin` template toevoegen aan de `email_templates` tabel zodat de tekst via de admin bewerkbaar is. Als deze stap te veel is kan de fallback-HTML volstaan.

### Technische details
- Import van `_shared/email-templates.ts` voor `getRenderedTemplate`, `SENDER_EMAIL`, `SENDER_NAME`, `logEmail`
- Mailjet API-keys al beschikbaar als secrets
- Geen extra secrets nodig
- Alleen de edge function wordt aangepast + herdeployed
- Bestaande todo-logica blijft ongewijzigd

### Resultaat
Bij elke ingediende logiesofferte ontvang je direct een e-mail met de details en een link naar het admin-paneel.

