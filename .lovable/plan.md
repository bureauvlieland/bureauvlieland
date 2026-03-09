

## Introductiemail versturen naar partners

### Aanpak

Een nieuwe edge function `send-partner-intro-email` die:
1. Bij aanroep met `test: true` alleen naar `hallo@bureauvlieland.nl` stuurt
2. Bij aanroep zonder test naar alle unieke e-mailadressen van uitgenodigde partners stuurt (met deduplicatie op `COALESCE(contact_email, email)`)

### E-mailtekst (tutoyerend)

**Onderwerp:** De partnerportal van Bureau Vlieland — even voorstellen

**Body:**

Beste partner,

De afgelopen weken heb je van ons een uitnodiging ontvangen om in te loggen op onze nieuwe partnerportal. Sommigen van jullie hebben er al mee gewerkt — fijn!

Ik snap dat je misschien dacht: "Wat is dit nu weer?" Daarom wil ik even kort uitleggen waarom we dit hebben opgezet.

We willen de samenwerking tussen Bureau Vlieland en onze partners zo soepel mogelijk maken. De portal is daar een belangrijk middel voor. Wat kun je er onder andere mee?

- **Directe inzage** in aanvragen van Bureau Vlieland die voor jou relevant zijn
- **Eenvoudig reageren** op aanvragen
- **Overzicht** van je activiteiten, offertes en facturen op één plek
- **Minder heen-en-weer mailen** — alles centraal bijgehouden

Ik zou graag een keer langskomen of bellen om het idee erachter uit te leggen en de werkwijze samen door te nemen. Zou je mij twee momenten kunnen voorstellen waarop dat uitkomt?

Je kunt reageren op deze mail of me bellen op 0562 700 208.

Hartelijke groet,
Erwin
Bureau Vlieland

### Technisch

| Wat | Detail |
|---|---|
| Nieuwe edge function | `supabase/functions/send-partner-intro-email/index.ts` |
| Config | Toevoegen aan `supabase/config.toml` met `verify_jwt = false` |
| Verzending | Via Mailjet (bestaande keys) |
| Auth check | Admin-rol verificatie |
| Deduplicatie | `SELECT DISTINCT COALESCE(contact_email, email)` van actieve, uitgenodigde partners |
| Reply-To | `hallo@bureauvlieland.nl` (geen project-gebonden reply) |
| Logging | Elke verzonden mail wordt gelogd in `email_log` met type `partner_intro_portal` |
| Test modus | Parameter `test: true` stuurt alleen naar `hallo@bureauvlieland.nl` |

Na goedkeuring bouw ik de functie en roep ik hem direct aan in testmodus.

