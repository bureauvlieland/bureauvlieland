

## Plan: Auth e-mail synchronisatie fixen

### Stap 1 — Direct fix: e-mailadres Torenzicht corrigeren

Het auth-account van Torenzicht staat op `info@torenzichtvlieland.nl`. Dit moet worden bijgewerkt naar `info@torenzicht.nl` zodat wachtwoord-reset werkt. Dit doe ik via de Supabase Admin API in een edge function of via een directe database-update op `auth.users`.

### Stap 2 — Structurele fix: admin e-mail sync bij opslaan

Wanneer een admin het e-mailadres van een partner wijzigt in het AdminPartnerDetail-scherm, wordt momenteel alleen de `partners` tabel bijgewerkt. De wijziging moet ook worden doorgevoerd naar het gekoppelde `auth.users` account.

**Aanpak:** Een nieuwe edge function `update-partner-email` die:
1. Valideert dat de aanroeper admin is
2. Het partner-record update in de `partners` tabel
3. Via de Supabase Admin API (`auth.admin.updateUserById`) het auth-e-mailadres synchroniseert
4. Wordt aangeroepen vanuit het admin partner-detail scherm wanneer het e-mailadres wijzigt

**Bestanden:**

| Bestand | Wijziging |
|---|---|
| `supabase/functions/update-partner-email/index.ts` | Nieuw — edge function voor e-mail sync |
| Admin partner detail component | Aanroep naar edge function bij e-mail wijziging |

### Waarom niet in de frontend?

De Supabase client-side SDK heeft geen `auth.admin.updateUserById` — dat vereist de service role key die alleen server-side beschikbaar is. Daarom is een edge function noodzakelijk.

