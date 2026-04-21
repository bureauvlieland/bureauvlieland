

## Akkoord met terugwerkende kracht mogelijk maken

### Probleem
In het screenshot zie ik dat geen enkele "Akkoord"-knop werkt. Niet omdat de programmadata in het verleden liggen, maar omdat de **geldigheidsdatum van het voorstel** (`quote_valid_until` = 2 maart 2026) is verstreken. Beide edge functions die akkoord verwerken (`accept-quote-proposal` en `approve-quote-item`) blokkeren hard op `quote_valid_until < now()`. De foutmelding is "Dit voorstel is verlopen", maar in de UI komt dat momenteel waarschijnlijk niet duidelijk binnen — de knop lijkt gewoon niets te doen.

### Oplossing — twee lagen

**1. Korte termijn (deze case oplossen):** verleng de geldigheidsdatum van dit specifieke project. Dit is een eenmalige database-update via een migratie. Voor het project van Jack Frieling (id `d548e22b-…`) zet ik `quote_valid_until` op een datum in de toekomst zodat klant + admin direct akkoord kunnen geven.

**2. Structureel (admin override):** voeg in beide edge functions een check toe die de validity-blokkade overslaat als de aanroep van een **admin-impersonatie** komt. Op die manier kun je als beheerder altijd met terugwerkende kracht namens een klant akkoorderen, ook als het oorspronkelijke voorstel is verlopen.

   - In `approve-quote-item` bestaat `admin_override` al als parameter, maar de validity-check op regel 144-152 staat *vóór* de admin-check. Die verplaats ik naar binnen een `if (!admin_override)`-blok.
   - In `accept-quote-proposal` zit de check al wél binnen `if (!isAdmin)` (regel 301-331), dus daar werkt admin-override correct. Geen wijziging nodig.
   - In de klant-flow (`approveQuoteItem` in `useCustomerProgram.ts`) geef ik `admin_override: true` mee wanneer er een `?impersonate=admin` token in de URL staat — exact dezelfde patroon als het bestaande Admin Impersonation-mechanisme (zie memory).

**3. UX-fix (foutmelding tonen):** de huidige `approveQuoteItem`-functie in `useCustomerProgram.ts` slikt de foutmelding stilletjes (`console.error`). Ik laat 'm de Nederlandstalige error van de edge function via een toast tonen ("Dit voorstel is verlopen — neem contact op met Bureau Vlieland"). Zo weten klanten in de toekomst meteen waarom de knop niet doet wat ze verwachten.

### Bestanden

| Bestand | Wijziging |
|---|---|
| **Migratie** (nieuw SQL) | `quote_valid_until` van project Jack Frieling (`d548e22b-663d-439c-b0fa-f2b5441a00cd`) verlengen naar 2026-12-31 |
| `supabase/functions/approve-quote-item/index.ts` | Validity-check binnen `if (!admin_override)`-blok plaatsen (regels 143-152) |
| `src/hooks/useCustomerProgram.ts` | `approveQuoteItem` + `acceptQuoteProposal`: `admin_override` doorgeven bij impersonatie; toast tonen bij fout |

### Wat we NIET doen
- Geen verwijdering van de validity-check in z'n geheel — die beschermt klanten tegen het ongemerkt accepteren van verlopen prijzen, dat blijft waardevol.
- Geen wijziging aan `update-customer-program` — die heeft geen validity-check (per-item akkoord via oudere flow werkt daar al).
- Geen wijziging aan andere lopende projecten — alleen de zichtbaar geblokkeerde case van Jack Frieling.

