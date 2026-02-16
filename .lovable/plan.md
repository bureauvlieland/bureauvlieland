

## Plan: Email template opwaarderen en koppelen aan offerte-preview

### Probleem
1. De email template `quote_offer_customer` bevat platte tekst zonder HTML-opmaak, CTA-knop of link naar de klantomgeving
2. De "Standaard tekst" knop op de offerte-preview laadt uit `app_settings` in plaats van uit de email template

### Aanpak

#### 1. Email template `quote_offer_customer` updaten met volledige HTML
- Dezelfde visuele stijl als de andere templates (navy header, witte content, afgeronde hoeken)
- CTA-knop "Bekijk voorstel & geef akkoord" met link naar `{{portal_url}}`
- Programmadetails blok met `{{dates}}`, `{{number_of_people}}`
- Geldigheidsmelding met `{{valid_until}}`
- Optioneel persoonlijk bericht blok via `{{#if personal_message}}`
- Contactgegevens footer

#### 2. AdminQuotePreview "Standaard tekst" knop aanpassen
- Laden uit `email_templates` tabel (id: `quote_offer_customer`) in plaats van `app_settings`
- Variabelen (`{{customer_name}}`, `{{valid_until}}`, etc.) automatisch invullen met de projectdata
- Alleen de platte tekst-versie tonen in het tekstveld (de HTML-versie wordt door de edge function gegenereerd)

#### 3. Opruimen
- De zojuist aangemaakte `app_settings` entry `default_quote_personal_message` kan verwijderd worden (wordt vervangen door de email template)

### Technische details

**Database migratie:**
- UPDATE `email_templates` SET `body_html` = volledige HTML template voor `quote_offer_customer`
- DELETE `app_settings` WHERE id = `default_quote_personal_message`

**Bestanden:**
- `src/pages/admin/AdminQuotePreview.tsx`: "Standaard tekst" knop wijzigen om uit email_templates te laden en variabelen te vervangen
- `supabase/functions/send-quote-offer/index.ts`: Geen wijziging nodig - de edge function genereert al een volledige HTML email met CTA onafhankelijk van de template

**Opmerking:** De edge function gebruikt de template-tekst als "intro" en bouwt daar zelf een complete email omheen met programmatabel en CTA-knop. De HTML in de template is dus primair voor weergave op de admin templates-pagina en voor eventueel toekomstig direct gebruik.

