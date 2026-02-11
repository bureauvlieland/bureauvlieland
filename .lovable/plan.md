

# Plan: Activatiestatus bijwerken bij eerste login

## Probleem
De onboarding-status van een partner wordt bepaald door het veld `password_set_at`:
- Geen `auth_user_id` --> "Niet uitgenodigd"
- Wel `auth_user_id`, geen `password_set_at` --> "Wacht op activatie"
- `password_set_at` gevuld --> "Actief"

Het veld wordt momenteel alleen gezet wanneer een partner het wachtwoord reset via de reset-pagina. Maar als een partner direct inlogt met de verstrekte credentials, wordt `password_set_at` nooit gevuld en blijft de status op "Wacht op activatie" staan.

## Oplossing

### 1. PartnerLogin.tsx aanpassen
Na een succesvolle login als partner (regel 105-110), de edge function `update-partner-password-set` aanroepen. Dit zet `password_set_at` als die nog leeg is.

Toe te voegen na de succesvolle partner-check (rond regel 105):
```typescript
// Mark partner as activated on first login
try {
  await supabase.functions.invoke("update-partner-password-set");
} catch (err) {
  console.error("Error updating password_set_at:", err);
}
```

### 2. Data reparatie
Voor de partner "Bureau Vlieland" die al heeft ingelogd: `password_set_at` handmatig vullen in de database zodat de status direct correct wordt weergegeven.

### Geen verdere wijzigingen nodig
- De edge function `update-partner-password-set` bestaat al en werkt correct
- De statuslogica in `AdminPartners.tsx` hoeft niet te worden aangepast

**Bestanden:**
- `src/pages/PartnerLogin.tsx` (kleine toevoeging na succesvolle login)
- Database update voor bestaande partner
