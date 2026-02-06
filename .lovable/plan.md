

# Direct inloggegevens mailen in plaats van activeringslink

## Wat verandert er?

De uitnodigingsmail bevat voortaan direct het emailadres en een tijdelijk wachtwoord. De partner logt in op de normale loginpagina. Geen activeringslink meer, dus ook geen verlopen links meer.

## Moet ik alles resetten?

**Nee.** Bestaande partner-accounts blijven intact. Partners die al geactiveerd zijn merken hier niets van. Voor partners die nog niet geactiveerd zijn, gebruik je "Opnieuw uitnodigen" -- zij krijgen dan de nieuwe mail met inloggegevens.

## Wat wordt er aangepast?

### 1. `invite-partner` edge function

- Verwijder het aanmaken van een recovery link (`generateLink`)
- Het tijdelijke wachtwoord dat al gegenereerd wordt (voor `createUser`) wordt nu meegestuurd in de email
- Fallback email-template: "Account Activeren" knop vervangen door een blok met inloggegevens (email + wachtwoord + loginlink)
- Template variabelen: `reset_link` vervangen door `partner_email`, `partner_password`, `login_link`

### 2. `bulk-invite-partners` edge function

- Zelfde wijzigingen als `invite-partner` (recovery link verwijderen, wachtwoord meesturen)
- Fallback email-template bijwerken

### 3. `resend-partner-invitation` edge function

- In plaats van een recovery link te genereren: reset het wachtwoord via `adminClient.auth.admin.updateUserById()` met een nieuw gegenereerd wachtwoord
- Stuur het nieuwe wachtwoord mee in de email
- Fallback email-template bijwerken

### 4. Database email template

- De bestaande database-template (`partner_invitation`) moet aangepast worden met de nieuwe variabelen
- Dit is iets wat je zelf via de admin UI kunt doen na de implementatie, of ik kan de variabelen documenteren

## Wat verandert er NIET?

- De loginpagina (`/partner/login`) blijft exact hetzelfde
- "Wachtwoord vergeten" blijft beschikbaar als fallback
- Bestaande geactiveerde partners worden niet geraakt
- De `/partner/reset-password` pagina blijft bestaan voor de "wachtwoord vergeten" flow
- Geen database-migraties nodig

## Technische details

### Wachtwoord generatie

Er wordt al een tijdelijk wachtwoord gegenereerd bij het aanmaken van de user. Dit wordt nu ook meegestuurd:

```text
// Bestaande code:
const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";

// Wordt leesbaaarder:
const tempPassword = "Vlieland-" + Math.floor(1000 + Math.random() * 9000);
```

Het wachtwoord wordt leesbaar en makkelijk over te typen (bijv. `Vlieland-4827`).

### Email inhoud (nieuw blok in plaats van "Activeren" knop)

```text
Uw inloggegevens:
- Emailadres: partner@example.com  
- Wachtwoord: Vlieland-4827
- Inloggen: https://bureauvlieland.lovable.app/partner/login

Wijzig uw wachtwoord na eerste login via Instellingen.
```

### Bestanden die worden aangepast

| Bestand | Wijziging |
|---|---|
| `supabase/functions/invite-partner/index.ts` | Recovery link eruit, wachtwoord in email, leesbaar wachtwoord |
| `supabase/functions/bulk-invite-partners/index.ts` | Zelfde als invite-partner |
| `supabase/functions/resend-partner-invitation/index.ts` | Recovery link eruit, wachtwoord reset + in email |

