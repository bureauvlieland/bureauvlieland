

## Plan: Tijdelijk wachtwoord inzichtelijk maken voor admin

### Probleem
Bij het uitnodigen van een partner wordt een tijdelijk wachtwoord gegenereerd (bijv. `Vlieland-4821`), maar dit wordt nergens opgeslagen. De admin kan het alleen terugvinden in de verzonden e-mail. Als de partner de mail niet ontvangt of kwijtraakt, moet de admin opnieuw uitnodigen.

### Oplossing
Het tijdelijke wachtwoord opslaan in de `partners` tabel en tonen in de admin UI. Na het eerste succesvolle inloggen (wanneer `password_set_at` wordt gezet) wordt het veld gewist.

### Stappen

**1. Database migratie**
- Kolom `initial_password` (text, nullable) toevoegen aan `partners`

**2. Edge functions updaten (3 bestanden)**
- `invite-partner/index.ts`: `tempPassword` opslaan in `partners.initial_password`
- `resend-partner-invitation/index.ts`: idem, nieuw wachtwoord opslaan
- `bulk-invite-partners/index.ts`: idem

**3. Wachtwoord wissen bij eerste login**
- In `PartnerLogin.tsx`: na succesvolle login, als `password_set_at` wordt gezet, ook `initial_password` op `null` zetten

**4. Admin UI tonen**
- `AdminPartnerDetail.tsx`: als `initial_password` gevuld is (partner heeft nog niet zelf ingelogd), het wachtwoord tonen met een copy-knop en een waarschuwingstekst
- Alleen zichtbaar zolang partner status "pending" is (geen `password_set_at`)

### Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/migrations/...` | Kolom `initial_password` toevoegen |
| `supabase/functions/invite-partner/index.ts` | `initial_password` opslaan |
| `supabase/functions/resend-partner-invitation/index.ts` | idem |
| `supabase/functions/bulk-invite-partners/index.ts` | idem |
| `src/pages/PartnerLogin.tsx` | `initial_password` wissen bij login |
| `src/pages/admin/AdminPartnerDetail.tsx` | Wachtwoord tonen met copy-knop |

