

## Plan: Ontbrekende automatische e-mails toevoegen

### Huidige dekking (wat al werkt)
- Programma-aanvraag → bureau + klant + partners
- Partner statusupdate (confirmed/unavailable/alternative) → klant
- Tegenvoorstel klant → partner + reactie terug naar klant
- Annulering → klant + partners + logiespartners
- Offerte verstuurd → klant
- Logiesaanvraag → bureau + klant + partners
- Logiesofferte ontvangen → klant (notify-accommodation-quote)
- Logies geselecteerd → partner + klant
- Commissiebevestiging → partner
- Chat → bureau + bezoeker
- Datumwijziging, itemwijziging, toevoeging → partner + klant
- Alle partners gereageerd → admin_todo (geen mail)
- Akkoord klant op offertevoorstel → partners worden direct gemaild

### Ontbrekende e-mails (5 gaps)

| # | Trigger | Ontvanger | Waarom nuttig |
|---|---|---|---|
| 1 | **Klant accepteert individueel item** (akkoord-knop) | Bureau (admin) | Bureau weet niet dat de klant een item heeft geaccepteerd. Er wordt alleen een history-entry gemaakt, geen mail of todo. |
| 2 | **Klant annuleert individueel item** | Bureau (admin) | Zelfde als hierboven — geen notificatie naar bureau. |
| 3 | **Alle items geaccepteerd door klant** (quote_status → akkoord_ontvangen) | Bureau (admin) | Bij per-item akkoord (niet-offerte flow) mist de bureau-notificatie dat álles nu akkoord is. |
| 4 | **Partner dient logiesofferte in** | Bureau (admin) | Er gaat nu alleen een mail naar de klant (notify-accommodation-quote). Bureau krijgt geen seintje dat er een nieuwe offerte is binnengekomen. |
| 5 | **Klant accepteert logiesofferte** (select-accommodation-quote) | Bureau (admin) | Bureau moet weten dat de klant een keuze heeft gemaakt. Nu alleen partner + klant genotificeerd. |

### Voorstel

Alle 5 gaps oplossen als **admin_todo's** + optioneel een **e-mail naar bureau** (erwin@bureauvlieland.nl). Admin_todo's zijn het belangrijkst want die verschijnen direct in het dashboard.

**Gap 1 + 2 + 3: Klant accepteert/annuleert item**
In `supabase/functions/update-customer-program/index.ts`:
- Bij `acceptItemId`: admin_todo aanmaken ("Klant {naam} akkoord op {item}")
- Bij `cancelItemId`: admin_todo aanmaken ("Klant {naam} annuleert {item}")
- Bij alle items geaccepteerd: admin_todo + mail naar bureau

**Gap 4: Partner dient logiesofferte in**
In `supabase/functions/notify-accommodation-quote/index.ts` (wordt al aangeroepen bij partner-indienen):
- Admin_todo toevoegen: "Nieuwe logiesofferte van {partner} voor {referentie}"

**Gap 5: Klant selecteert logiesofferte**
In `supabase/functions/select-accommodation-quote/index.ts`:
- Admin_todo toevoegen: "Klant {naam} heeft logies {partner} geselecteerd"

### Bestanden
1. `supabase/functions/update-customer-program/index.ts` — admin_todo's bij item accept/cancel + all-accepted notificatie
2. `supabase/functions/notify-accommodation-quote/index.ts` — admin_todo bij nieuwe logiesofferte
3. `supabase/functions/select-accommodation-quote/index.ts` — admin_todo bij klant-selectie logies

