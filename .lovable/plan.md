

## Plan: Per-item akkoord in klantportaal voor maatwerk programma's

### Wat verandert er?

Nu kan een klant alleen het **hele programma** in een keer akkoord geven. Na dit plan kan een klant **per onderdeel** akkoord geven. Dit maakt het mogelijk om:
- Items stapsgewijs beschikbaar te stellen (admin voegt gaandeweg items toe)
- De klant alvast onderdelen vast te leggen terwijl andere nog in voorbereiding zijn
- Partners sneller benaderd te worden voor bevestigde onderdelen

### Hoe werkt het voor de klant?

1. Elk item met `item_quote_status = "bevestigd"` krijgt een **"Akkoord"**-knop in het klantportaal
2. Bij klik wordt alleen dat item naar de partner gestuurd (aanvraag-email)
3. De bestaande "Akkoord, start reserveringen"-knop blijft bestaan als snelknop om **alle resterende** items in een keer te accorderen
4. Items die de klant al heeft goedgekeurd tonen een groen vinkje ("Goedgekeurd")
5. Items die nog `concept` of `in_afstemming` zijn, tonen "In voorbereiding" -- daar kan de klant nog niet op klikken

### Technische aanpak

**1. Nieuw veld `customer_approved_at` op `program_request_items`** (migratie)
- Timestamp die vastlegt wanneer de klant dit specifieke item heeft goedgekeurd in de offerte-fase
- Verschilt van `customer_accepted_at` (dat is voor na partner-bevestiging bij alternatieven)

**2. Nieuwe edge function `approve-quote-item`**
- Accepteert `token` + `item_id`
- Valideert dat het programma een quote is met status `offerte_verstuurd`
- Valideert dat het item `item_quote_status = "bevestigd"` heeft
- Zet `customer_approved_at` + `skip_partner_notification = false`
- Stuurt de partner-notificatie voor alleen dit item (hergebruikt email-logica uit `accept-quote-proposal`)
- Logt in `program_request_history`
- Als **alle** bevestigde items nu approved zijn, zet automatisch `quote_status = "akkoord_ontvangen"`

**3. UI-aanpassingen klantportaal**

- **`CustomerProgramItem.tsx`**: Toon een "Akkoord"-knop voor items waar `item_quote_status === "bevestigd"` en `customer_approved_at === null` (alleen in offerte-modus)
- **`ProgramIntroCard.tsx`**: Pas de tekst aan om uit te leggen dat items individueel geaccordeerd kunnen worden. De "Akkoord, start reserveringen"-knop wordt "Alle resterende akkoord geven" en is alleen actief als er nog niet-goedgekeurde items met status `bevestigd` zijn
- **`ItemStatusBadge`**: Toon "Goedgekeurd" als `customer_approved_at` is gezet in offerte-fase

**4. Hook `useCustomerProgram.ts`**
- Nieuwe functie `approveQuoteItem(itemId)` die de edge function aanroept
- Doorgeven aan `CustomerProgramItem`

**5. Aanpassing `accept-quote-proposal` edge function**
- Overslaan van items die al `customer_approved_at` hebben (partners zijn al benaderd)
- Alleen resterende items verwerken

### Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| DB migratie | Kolom `customer_approved_at` toevoegen |
| `supabase/functions/approve-quote-item/index.ts` | Nieuw: per-item goedkeuring + partnermail |
| `supabase/functions/accept-quote-proposal/index.ts` | Overslaan van reeds goedgekeurde items |
| `src/types/programRequest.ts` | Veld `customer_approved_at` aan interface toevoegen |
| `src/hooks/useCustomerProgram.ts` | Nieuwe `approveQuoteItem()` functie |
| `src/components/customer-portal/CustomerProgramItem.tsx` | "Akkoord"-knop voor bevestigde offerte-items |
| `src/components/customer-portal/ProgramIntroCard.tsx` | Aangepaste tekst + "Alle resterende akkoord"-knop |
| `src/components/customer-portal/DesktopProgramView.tsx` | Doorvoeren nieuwe prop |
| `src/components/customer-portal/MobileProgramView.tsx` | Doorvoeren nieuwe prop |

