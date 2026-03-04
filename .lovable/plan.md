

## Plan: E-mail notificaties uitbreiden en synchroniseren

### Overzicht

Na de recente toevoegingen (contact_email, alternatieve datums) zijn er nog 3 edge functions die `contact_email` missen en ontbreekt er een notificatie voor alternatieve datums bij logiesaanvragen. Daarnaast gebruikt `send-program-request` hardcoded `providerEmail` uit het formulier zonder fallback naar de database.

### Analyse: wat mist er?

| Functie | Probleem |
|---|---|
| `send-program-request` | Gebruikt `providerEmail` uit form data, geen database lookup voor `contact_email` |
| `send-customer-accommodation-message` | Query `partner.email` zonder `contact_email` |
| `update-partner-item-status` | Stuurt customer emails (correct), maar geen notificatie naar Bureau bij alternatieve datums logies |
| `PartnerAccommodation.tsx` (decline met alt dates) | Geen e-mailnotificatie naar Bureau Vlieland bij alternatieve datums voorstel |

Functies die **al correct** zijn: `cancel-program-request`, `update-customer-program`, `accept-quote-proposal`, `approve-quote-item`, `process-completed-items`, `select-accommodation-quote`, `send-accommodation-quote-request`, `notify-accommodation-quote`.

Functies die **bewust `partner.email` gebruiken** (login-gerelateerd): `invite-partner`, `resend-partner-invitation`, `resend-email` — deze blijven ongewijzigd.

### Stappen

**1. `send-customer-accommodation-message/index.ts`**
- Query aanpassen: `select("email, contact_email, name, booking_contact_name")`
- Recipient: `partner.contact_email || partner.email`

**2. `send-program-request/index.ts`**
- Na het groeperen van blocks per provider: database lookup doen voor providers met `contact_email`
- Overschrijf `providerEmail` met `contact_email` als die bestaat
- Vereist: supabase client toevoegen (ontbreekt nu in deze functie)

**3. E-mail notificatie bij alternatieve datums logiesaanvraag**
- In `PartnerAccommodation.tsx`: na het opslaan van een decline met alternatieve datums, een e-mail sturen naar Bureau Vlieland met de voorgestelde datums
- Kan via de bestaande `send-project-email` edge function (admin-only) of via een directe Mailjet call in een nieuwe helper
- Alternatief: een auto-email vanuit de database trigger of een aparte edge function
- **Aanbevolen**: vanuit `PartnerAccommodation.tsx` een Supabase insert in `project_communications` doen + de admin todo (al geïmplementeerd). Bureau Vlieland ziet dit dan in het admin-dashboard. Een aparte e-mail is niet strikt nodig omdat de admin-todo al een high-priority notificatie creëert.

**4. Admin notificatie e-mail bij alternatieve datums (optioneel)**
- Nieuwe edge function `notify-alternative-dates` of uitbreiden van bestaande logica
- Stuurt een korte e-mail naar `erwin@bureauvlieland.nl` met de voorgestelde datums, partnernaam en link naar admin accommodation detail

### Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/send-customer-accommodation-message/index.ts` | `contact_email` toevoegen aan partner query |
| `supabase/functions/send-program-request/index.ts` | Database lookup voor `contact_email`, supabase client toevoegen |
| `src/pages/PartnerAccommodation.tsx` | Na decline met alt dates: e-mail naar Bureau via edge function of directe insert |

