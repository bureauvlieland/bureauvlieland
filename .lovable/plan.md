

# Fix: Partner e-mail synchronisatie bij uitnodiging

## Analyse van het probleem

Er zijn twee samenhangende bugs gevonden bij Brouwerij Fortuna (en potentieel andere partners):

### Kernprobleem: e-mail desynchronisatie

1. Partner werd op 11 feb aangemaakt met e-mail `info@fortuna-vlieland.nl` — dit werd ook het auth (login) e-mailadres
2. Later is het e-mailadres in het partner record gewijzigd naar `winkel@fortunavlieland.nl`
3. Het auth user e-mailadres bleef staan op `info@fortuna-vlieland.nl`

Dit veroorzaakt drie fouten:
- **"Wachtwoord vergeten" werkt niet**: de partner vult `winkel@fortunavlieland.nl` in, maar er bestaat geen auth user met dat adres
- **Herinneringsmail misleidt**: de mail gaat naar `winkel@fortunavlieland.nl` en toont dat als loginadres, maar inloggen moet met `info@fortuna-vlieland.nl`
- **Inloggen met het genoemde wachtwoord faalt**: de partner gebruikt `winkel@fortunavlieland.nl` + het nieuwe wachtwoord, maar de auth user staat op een ander adres

### Acute fix voor Fortuna

Het auth user e-mailadres moet worden bijgewerkt naar `winkel@fortunavlieland.nl` zodat login en wachtwoord-reset weer werken.

### Structurele fix

De `resend-partner-invitation` edge function moet bij het resetten ook het auth user e-mailadres synchroniseren met het partner record, zodat dit probleem niet meer kan optreden.

---

## Wijzigingen

### 1. Database: Auth user e-mail bijwerken voor Fortuna

Via de `resend-partner-invitation` fix wordt dit automatisch opgelost bij de eerstvolgende resend. Maar we moeten het nu direct fixen.

We doen dit via een aanpassing in de `resend-partner-invitation` edge function die het auth e-mailadres synchroniseert -- en daarna opnieuw de uitnodiging versturen.

### 2. `supabase/functions/resend-partner-invitation/index.ts`

Na het ophalen van de partner data en voor het resetten van het wachtwoord, de volgende logica toevoegen:

```
// Synchroniseer auth user email als deze afwijkt van partner email
const { data: authUser } = await adminClient.auth.admin.getUserById(partner.auth_user_id);
if (authUser?.user?.email !== partner.email) {
  await adminClient.auth.admin.updateUserById(partner.auth_user_id, {
    email: partner.email,
    email_confirm: true,
  });
}
```

Dit zorgt ervoor dat bij elke resend het auth e-mailadres wordt gesynchroniseerd met het partner record. Zo kan de partner altijd inloggen met het e-mailadres dat in de uitnodigingsmail staat.

### 3. `supabase/functions/invite-partner/index.ts`

Geen wijziging nodig — bij de eerste invite wordt de auth user aangemaakt met `partner.email`, dus daar is geen mismatch.

### 4. Wachtwoord vergeten flow

Geen codewijziging nodig. Zodra het auth e-mailadres is gesynchroniseerd, werkt de bestaande `resetPasswordForEmail()` flow correct.

---

## Stappen na implementatie

1. Edge function deployen
2. Vanuit admin opnieuw uitnodiging sturen naar Fortuna
3. Fortuna ontvangt mail op `winkel@fortunavlieland.nl` met correct wachtwoord en kan inloggen met datzelfde adres

