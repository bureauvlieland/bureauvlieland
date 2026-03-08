

## Probleem

Partner Torenzicht probeert "Wachtwoord vergeten" te gebruiken op de loginpagina. Dit faalt op twee manieren:

1. **Reset email verzenden mislukt** — `supabase.auth.resetPasswordForEmail()` gebruikt het ingebouwde Supabase e-mailsysteem, maar er is geen custom e-maildomain geconfigureerd. Het standaard Supabase e-mailsysteem heeft strikte rate limits (~3/uur) en beperkte deliverability.

2. **Oude uitnodigingslink verlopen** — De partner is uitgenodigd op 11 februari, nooit ingelogd. Supabase recovery links verlopen na 1 uur.

**Kern van het probleem:** De "wachtwoord vergeten" flow gebruikt Supabase's ingebouwde e-mail, terwijl alle andere partner-communicatie via Mailjet loopt (betrouwbaar en werkend). Dit moet consistent worden gemaakt.

---

## Oplossing: Custom wachtwoord-reset via Mailjet

### Stap 1: Nieuwe edge function `send-partner-reset-email`

Maakt gebruik van `supabase.auth.admin.generateLink({ type: 'recovery', email })` om een recovery URL te genereren, en stuurt deze vervolgens via Mailjet naar de partner — dezelfde betrouwbare route als alle andere partner e-mails.

- Geen JWT vereist (partner is niet ingelogd)
- Beveiligd met rate-limiting check (max 1 per 60 seconden per e-mailadres, via `email_log` tabel)
- Valideert dat het e-mailadres gekoppeld is aan een actieve partner
- Logt de e-mail in `email_log`

### Stap 2: PartnerLogin.tsx aanpassen

`handleForgotPassword` wijzigen om de nieuwe edge function aan te roepen in plaats van `supabase.auth.resetPasswordForEmail`:

```text
Oud: supabase.auth.resetPasswordForEmail(email, { redirectTo })
Nieuw: supabase.functions.invoke("send-partner-reset-email", { body: { email } })
```

### Stap 3: Config

Toevoegen aan `supabase/config.toml`: `[functions.send-partner-reset-email]` met `verify_jwt = false`.

---

## Samenvatting wijzigingen

| Type | Bestand |
|---|---|
| Nieuw | `supabase/functions/send-partner-reset-email/index.ts` |
| Gewijzigd | `src/pages/PartnerLogin.tsx` (handleForgotPassword) |
| Gewijzigd | `supabase/config.toml` (nieuwe function entry) |

**Direct resultaat:** Partner Torenzicht (en alle partners) kunnen betrouwbaar hun wachtwoord resetten via Mailjet, zonder afhankelijk te zijn van Supabase's ingebouwde e-mailservice.

