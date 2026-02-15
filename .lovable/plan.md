

# Beta-banner in klantportaal + opmerking in offerte-email

## Wat verandert

### 1. Nieuwe app_setting: `portal_beta_banner_enabled`
Een boolean instelling in de `app_settings` tabel waarmee de beta-banner aan- en uitgezet kan worden vanuit de admin-instellingen. Zodra de portal stabiel genoeg is, schakelt u deze simpelweg uit.

### 2. Beta-banner in het klantportaal
Bovenaan de pagina `/mijn-programma/:token` verschijnt een subtiele, vriendelijke banner:

> **Nieuw! Vernieuwde klantomgeving** -- Wij werken momenteel met een volledig vernieuwde klantomgeving. Mocht u ergens tegenaan lopen, dan horen wij dat graag via hallo@bureauvlieland.nl.

De banner wordt alleen getoond als `portal_beta_banner_enabled` aan staat. Styling: lichtblauw informatief blok met een sluitknop (dismiss per sessie).

### 3. Opmerking in de offerte-email
In de `send-quote-offer` edge function wordt een korte, professionele zin toegevoegd aan de bevestigingsmail die de klant ontvangt bij het versturen van de offerte:

> Wij werken momenteel met een vernieuwde klantomgeving. Mocht u ergens tegenaan lopen, dan horen wij dat graag.

Dit wordt toegevoegd als korte paragraaf onder de hoofdinhoud van de mail, boven de footer.

## Technische details

### Database-migratie
- `INSERT` van een nieuw record in `app_settings`:
  - id: `portal_beta_banner_enabled`
  - category: `features`
  - label: `Beta-banner klantportaal`
  - description: `Toon een melding in het klantportaal dat de omgeving nieuw is`
  - value_type: `boolean`
  - value: `true`

### Bestanden die worden aangepast

1. **`src/types/appSettings.ts`** -- Toevoegen van `portal_beta_banner_enabled: boolean` aan `AppSettingsMap`.

2. **`src/lib/appSettings.ts`** -- Toevoegen van fallback `portal_beta_banner_enabled: false` aan `FALLBACK_SETTINGS`.

3. **`src/pages/CustomerProgram.tsx`** -- Nieuwe banner-component na de header, conditioneel op basis van de `portal_beta_banner_enabled` setting. Dismiss-state via `useState`.

4. **`supabase/functions/send-quote-offer/index.ts`** -- Extra paragraaf in de HTML-template van de klant-email.

### Impact
- De banner is alleen zichtbaar voor klanten in het portaal, niet op de publieke website
- Uitschakelbaar via de bestaande admin-instellingen pagina (verschijnt automatisch onder "Functies")
- De email-opmerking kan later handmatig verwijderd worden uit de edge function

