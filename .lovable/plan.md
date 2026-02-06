
# Fix Partner Wachtwoord Reset + Dynamische Commissies in E-mail

## Probleem 1: Wachtwoord instellen geeft fout

De partner klikt op de activeringslink uit de e-mail, komt op de "Nieuw wachtwoord instellen" pagina, maar krijgt "Fout: Kon wachtwoord niet wijzigen" na het invullen.

**Oorzaak**: De pagina wacht niet tot de recovery-sessie is opgebouwd. Wanneer de partner op de link klikt, moet Supabase eerst de recovery-token uit de URL verwerken om een sessie op te zetten. Dit is een asynchroon proces. De pagina toont het formulier meteen, maar als de partner snel invult en op "Opslaan" klikt voordat de sessie klaar is, faalt `updateUser()`.

**Oplossing**: De pagina aanpassen zodat:
- Er gewacht wordt op het `PASSWORD_RECOVERY` auth-event voordat het formulier actief wordt
- Een laadstatus wordt getoond terwijl de sessie wordt opgebouwd
- Een duidelijke foutmelding verschijnt als de recovery-link ongeldig of verlopen is

### Bestand: `src/pages/PartnerResetPassword.tsx`

- Voeg een `sessionReady` state toe (standaard `false`)
- In `useEffect`, luister naar `PASSWORD_RECOVERY` event en zet `sessionReady = true`
- Voeg een timeout toe (bijv. 5 seconden) -- als er geen recovery event binnenkomt, toon een foutmelding ("Link verlopen of ongeldig")
- Toon een spinner zolang `sessionReady` nog `false` is
- Schakel de submit-knop pas in wanneer `sessionReady === true`
- Voeg betere error handling toe bij `updateUser()` om specifieke fouten te tonen (bijv. "wachtwoord te zwak")

---

## Probleem 2: Verkeerde commissiepercentages in uitnodigingsmail

De e-mail vermeldt standaard "15% activiteiten, 10% logies", maar Strandhotel Seeduyn heeft 8% voor activiteiten. De commissiepercentages moeten dynamisch uit de partner-gegevens komen.

**Oplossing**: De commissiepercentages als template-variabelen meesturen bij het versturen van de uitnodigingsmail, en het e-mailtemplate aanpassen om deze variabelen te gebruiken.

### Bestand: `supabase/functions/invite-partner/index.ts`

- De partner data wordt al met `select("*")` opgehaald, dus `commission_percentage` en `accommodation_commission_percentage` zijn beschikbaar
- Voeg `commission_activity` en `commission_accommodation` toe aan de `templateVariables`:

```text
const templateVariables = {
  partner_name: ...,
  reset_link: ...,
  partner_portal_link: ...,
  commission_activity: partner.commission_percentage || 15,
  commission_accommodation: partner.accommodation_commission_percentage || 10,
};
```

- Pas de fallback HTML aan: vervang de hardcoded "15%" en "10%" door de variabelen

### Bestand: `supabase/functions/bulk-invite-partners/index.ts`

- Zelfde aanpassing als bij `invite-partner` -- commissiepercentages toevoegen aan templateVariables
- Fallback HTML bijwerken

### Bestand: `supabase/functions/resend-partner-invitation/index.ts`

- Zelfde aanpassing -- commissiepercentages toevoegen aan templateVariables

### Database: `email_templates` tabel (partner_invitation template)

- De body_html van het `partner_invitation` template aanpassen:
  - "15% commissie" vervangen door `{{commission_activity}}% commissie`
  - "10% commissie" vervangen door `{{commission_accommodation}}% commissie`
- De `variables` JSON bijwerken om de nieuwe variabelen toe te voegen

---

## Samenvatting van wijzigingen

| Bestand | Wijziging |
|---|---|
| `src/pages/PartnerResetPassword.tsx` | Wacht op recovery-sessie, toon laadstatus, betere foutafhandeling |
| `supabase/functions/invite-partner/index.ts` | Commissiepercentages als template-variabelen toevoegen |
| `supabase/functions/bulk-invite-partners/index.ts` | Idem |
| `supabase/functions/resend-partner-invitation/index.ts` | Idem |
| Database: `email_templates` | Template bijwerken met dynamische commissie-variabelen |
