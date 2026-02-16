

## Offerte-verstuur e-mail beheerbaar maken via templates

### Huidige situatie
De offerte-mail naar de klant is volledig hardcoded in de edge function `send-quote-offer`. De admin ziet alleen een optioneel "persoonlijke tekst" veld, maar kan de standaardtekst niet inzien of aanpassen.

### Gewenst resultaat
- Een standaard e-mail template voor het versturen van offertes, beheerbaar via /admin/berichten
- Bij het versturen van een offerte ziet de admin de volledige e-mailtekst (ingevuld met klantnaam, data, etc.)
- De admin kan de tekst aanpassen voordat deze wordt verstuurd
- De edge function gebruikt de (eventueel aangepaste) tekst in plaats van de hardcoded versie

### Aanpak

**Stap 1: Nieuw email template aanmaken (database)**

Een nieuw record in `email_templates` met id `quote_offer_customer`:

- **Onderwerp:** `Uw maatwerkvoorstel van Bureau Vlieland`
- **Body:** Een standaard begeleidende tekst met variabelen:
  - `{{customer_name}}` - Naam van de klant
  - `{{company_name}}` - Bedrijfsnaam (optioneel)
  - `{{dates}}` - Geformatteerde data
  - `{{number_of_people}}` - Aantal personen
  - `{{valid_until}}` - Geldigheidsdatum
  - `{{portal_url}}` - Link naar klantportaal

De standaardtekst wordt iets als:

```
Beste {{customer_name}},

Hierbij ontvangt u ons maatwerkvoorstel voor uw evenement op Vlieland.
Wij hebben dit programma speciaal voor {{company_name}} samengesteld.

{{#if personal_message}}
{{personal_message}}
{{/if}}

Dit voorstel is geldig tot {{valid_until}}. U kunt het voorstel bekijken
en akkoord geven in uw persoonlijke klantomgeving.

Heeft u vragen over dit voorstel? Neem gerust contact met ons op.

Met vriendelijke groet,
Bureau Vlieland
```

**Stap 2: AdminSendQuoteDialog uitbreiden**

Het huidige dialoogvenster wordt uitgebreid zodat de admin de volledige e-mailtekst ziet:

- Bij openen: het template ophalen uit de database en variabelen invullen (klantnaam, data, etc.)
- De ingevulde tekst tonen in een preview met een "Bewerken" knop (vergelijkbaar met de `ForwardQuoteToCustomerDialog`)
- In bewerkingsmodus: onderwerp en body aanpasbaar in tekstvelden
- De (aangepaste) tekst wordt meegestuurd naar de edge function

**Stap 3: Edge function aanpassen**

De `send-quote-offer` edge function wordt aangepast:

- Accepteert optioneel een `emailSubject` en `emailBody` parameter
- Als deze meegegeven worden: gebruik de aangepaste tekst als intro in de HTML-mail (de programmatabel en CTA-knop blijven automatisch gegenereerd)
- Als ze niet meegegeven worden: val terug op het template uit de database (backward compatible)
- Het "persoonlijke tekst" veld verdwijnt als apart concept; het is nu onderdeel van de volledige e-mailtekst

### Technische details

**Bestanden die worden aangepast:**
- `src/components/admin/AdminSendQuoteDialog.tsx` - Uitbreiden met template-preview en bewerkingsmodus
- `supabase/functions/send-quote-offer/index.ts` - Aangepaste tekst accepteren en verwerken

**Database:**
- INSERT in `email_templates` tabel met id `quote_offer_customer`

**Template ID toevoegen aan constants:**
- `supabase/functions/_shared/email-templates.ts` - Toevoegen van `QUOTE_OFFER_CUSTOMER` aan `TemplateIds`
