

## Plan: Contactadres los van loginadres voor partners

### Probleem
Drie Island Events hotels (De Wadden, Doniastate, Seeduyn) willen communicatie ontvangen op `info@islandevents.nl`, maar het loginsysteem vereist unieke e-mailadressen. Daarnaast zijn De Wadden en Doniastate gewijzigd in het admin-panel zonder dat de auth-accounts zijn meegesynchroniseerd.

### Huidige situatie

| Partner | partners.email | auth.email | Gewenst contact |
|---|---|---|---|
| Hotel De Wadden | info@islandevents.nl | dewadden@westcordhotels.nl | info@islandevents.nl |
| Hotel Doniastate | info@islandevents.nl | info@doniastatevlieland.nl | info@islandevents.nl |
| Strandhotel Seeduyn | info@islandevents.nl | info@islandevents.nl | info@islandevents.nl |

### Oplossing

Twee velden scheiden:
- **`email`** = login/auth e-mailadres (uniek per partner, gesynchroniseerd met auth)
- **`contact_email`** = optioneel contactadres voor notificaties (mag gedeeld worden)

Alle e-mail verstuurlogica gebruikt: `contact_email ?? email`

### Stappen

**1. Database migratie**
- Kolom `contact_email` (text, nullable) toevoegen aan `partners`
- `contact_email` instellen op `info@islandevents.nl` voor alle drie de hotels
- `email` herstellen naar de unieke auth-adressen voor De Wadden en Doniastate

**2. Edge functions updaten (6-8 bestanden)**

Overal waar `partner.email` wordt gebruikt voor het versturen van notificaties, wijzigen naar `partner.contact_email || partner.email`:

- `enrichProviderEmails` in `cancel-program-request` en `update-customer-program` — query `contact_email, email` en gebruik `contact_email || email`
- `accept-quote-proposal` — zelfde patroon
- `approve-quote-item` — fallback lookup aanpassen
- `process-completed-items` — `partner.contact_email || partner.email`
- `select-accommodation-quote` — idem
- `send-accommodation-quote-request` — idem
- `notify-accommodation-quote` — idem

De `resend-email` en `resend-partner-invitation` functies blijven `partner.email` gebruiken — dit zijn login-gerelateerde mails die naar het auth-adres moeten.

**3. Admin UI**
- `AdminPartnerDetail.tsx`: nieuw veld "Contactadres (optioneel)" toevoegen
- Toelichting: "Als ingevuld, worden notificaties naar dit adres gestuurd in plaats van het loginadres"
- Partner detail pagina: beide adressen tonen

**4. Partner portal**
- `PartnerSettingsForm.tsx`: contactadres tonen/bewerken

### Resultaat
- Elke partner heeft een uniek loginadres (wachtwoord-reset werkt altijd)
- Notificaties gaan naar het contactadres als dat is ingevuld
- Meerdere partners kunnen hetzelfde contactadres delen
- Bestaande partners zonder contactadres: geen wijziging (notificaties blijven naar loginadres gaan)

