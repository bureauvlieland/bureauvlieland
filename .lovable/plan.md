
# Fix: Partner activatiestatus wordt niet bijgewerkt na inloggen

## Probleem
Westcord Strandhotel Seeduyn (en waarschijnlijk alle andere partners) logt succesvol in, maar de status blijft op "Wacht op activatie". De oorzaak: de edge function `update-partner-password-set` wordt na login aangeroepen maar slaagt er niet in om `password_set_at` bij te werken.

De edge function logt niets, wat wijst op een fout bij het aanroepen zelf (mogelijk een autorisatie-issue: de functie verwacht een Bearer token, maar `supabase.functions.invoke()` stuurt dit pas mee als de sessie volledig geladen is).

## Oplossing

### Stap 1: Edge function robuuster maken
De huidige `update-partner-password-set` functie is correct opgezet, maar het probleem zit waarschijnlijk in de timing van de aanroep. Twee verbeteringen:

1. **Fallback direct in de login-flow**: Na succesvolle login, direct via de Supabase client `password_set_at` en `last_login_at` updaten op de `partners` tabel (de partner heeft al een RLS policy "Partners can update own data via auth"). Dit elimineert de afhankelijkheid van de edge function.

2. **Edge function behouden als backup**: Voor het geval partners via andere routes inloggen.

### Stap 2: Login-flow aanpassen in `PartnerLogin.tsx`
Vervang de edge function call door een directe database-update:

```typescript
// Na succesvolle login en partner-check:
const now = new Date().toISOString();
await supabase
  .from("partners")
  .update({ 
    password_set_at: partner.password_set_at || now,
    last_login_at: now 
  })
  .eq("id", partner.id);
```

Dit werkt direct via RLS (de partner is al ingelogd) en is betrouwbaarder dan een edge function call.

### Stap 3: Bestaande partners repareren
Een eenmalige database-update om Westcord Strandhotel en eventuele andere partners die al ingelogd zijn te fixen:

```sql
UPDATE partners 
SET password_set_at = NOW() 
WHERE id = 'hotel-seeduyn' AND password_set_at IS NULL;
```

### Stap 4: `last_login_at` ook bijwerken
Huidige code update `last_login_at` nergens. Dit veld meenemen in de login-flow voor toekomstig inzicht.

## Technische details

**Bestanden:**
- `src/pages/PartnerLogin.tsx` — login handler aanpassen: directe DB update i.p.v. edge function call
- Database migratie — fix Westcord Strandhotel

**Wijziging in `PartnerLogin.tsx`:**
Regels 105-110 vervangen:
```typescript
// OUD: edge function call (onbetrouwbaar)
try {
  await supabase.functions.invoke("update-partner-password-set");
} catch (err) {
  console.error("Error updating password_set_at:", err);
}

// NIEUW: directe database update (betrouwbaar via RLS)
try {
  const now = new Date().toISOString();
  await supabase
    .from("partners")
    .update({ 
      password_set_at: now,
      last_login_at: now,
    })
    .eq("auth_user_id", data.user.id);
} catch (err) {
  console.error("Error updating login status:", err);
}
```

**Impact:** Minimaal. Alleen de manier waarop de status wordt bijgewerkt verandert. De login-flow zelf blijft ongewijzigd.
