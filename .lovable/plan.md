
# Logies-offertes valideren, herinneringen en berichtenbeheer

## Samenvatting

Dit plan omvat drie samenhangende verbeteringen:

1. **Admin-validatie van partneroffertes** -- Offertes gaan niet meer rechtstreeks naar de klant. De admin valideert eerst en stuurt handmatig door.
2. **Automatische todo's voor nieuwe offertes** -- Bij elke nieuwe partnerofferte verschijnt een taak in de bestaande todo-lijst.
3. **Automatische herinneringen (cron-job)** -- Onbeantwoorde aanvragen en openstaande offertes worden na X dagen automatisch gesignaleerd, met configureerbare instellingen en e-mailtemplates.

---

## Fase 1: Admin-validatie van partneroffertes

### Probleem
Wanneer een partner een offerte indient, wordt er direct een e-mail naar de klant gestuurd (`notify-accommodation-quote`). De admin heeft geen controle over wat er naar de klant gaat.

### Oplossing

**A. Stop automatische klantnotificatie**

In `src/pages/PartnerAccommodation.tsx` en `src/pages/PartnerDashboard.tsx`: verwijder de aanroep naar `notify-accommodation-quote` bij het indienen van een offerte. In plaats daarvan wordt er een auto-todo aangemaakt voor de admin.

**B. Auto-todo bij nieuwe offerte**

Wanneer een partner een offerte indient (status wordt `submitted`), wordt er een auto-todo aangemaakt:
- Type: `quote_review` (nieuw auto-type)
- Titel: `Nieuwe logiesofferte: [partnernaam] voor [klantnaam]`
- Prioriteit: `normal`
- Gekoppeld aan de accommodation request

Dit gebeurt client-side in `PartnerAccommodation.tsx` via een nieuwe edge function of direct via de bestaande `autoTodoCreator` logica (aangepast zodat het via service_role werkt vanuit een edge function, omdat partners geen admin zijn).

Nieuwe edge function: `create-quote-review-todo`
- Ontvangt `quoteId`
- Haalt offerte, partner en aanvraag op
- Maakt auto-todo aan met type `quote_review`
- Stuurt optioneel een korte notificatie-e-mail naar Bureau Vlieland (hallo@bureauvlieland.nl)

**C. Admin stuurt offerte door naar klant**

In `AdminAccommodationDetail.tsx` bij de offertelijst:
- Nieuwe knop "Doorsturen naar klant" naast elke `submitted` offerte
- Opent een dialoog (vergelijkbaar met `SendAccommodationQuoteRequestDialog`) waarin de admin:
  - Het e-mailbericht kan bekijken en aanpassen (subject + body)
  - De e-mail verstuurt via de bestaande `notify-accommodation-quote` edge function
- Na het versturen wordt de offerte gemarkeerd als `forwarded_to_customer` (nieuw veld) en de todo als `done`

**D. Database-wijziging**

```
ALTER TABLE accommodation_quotes ADD COLUMN forwarded_at timestamptz;
```

Dit veld registreert wanneer de admin de offerte heeft doorgestuurd.

**E. Uitbreiding autoTodoCreator**

Nieuw type toevoegen aan `AutoTodoType`:
- `quote_review` -- "Offerte beoordelen"

---

## Fase 2: Automatische herinneringen (cron-based)

### Uitbreiding van de bestaande `check-pending-items` edge function

De bestaande cron-job wordt uitgebreid met extra checks:

**A. Nieuwe herinnering-types**

| Type | Trigger | Standaard dagen | Prioriteit |
|------|---------|----------------|------------|
| `quote_pending_partner` | Logiesaanvraag verstuurd naar partner, geen reactie | 5 dagen | normal -> high na 10d |
| `quote_pending_customer` | Offerte doorgestuurd naar klant, geen selectie | 7 dagen | normal |
| `request_no_response` | Programma-aanvraag zonder reactie van klant | 14 dagen | normal |

**B. Configureerbare instellingen**

Nieuwe rijen in `app_settings`:

| id | label | value |
|----|-------|-------|
| `reminder_days_partner_quote` | Herinnering partner (dagen) | 5 |
| `reminder_days_customer_quote` | Herinnering klant offerte (dagen) | 7 |
| `reminder_days_customer_request` | Herinnering klant aanvraag (dagen) | 14 |
| `reminder_email_enabled` | Automatische herinneringsmails | true |

Deze worden beheerbaar via de bestaande admin instellingenpagina.

**C. E-mailtemplates voor herinneringen**

Nieuwe templates in `email_templates`:

| id | Naam |
|----|------|
| `reminder_partner_quote` | Herinnering aan partner: offerte gevraagd |
| `reminder_customer_quote` | Herinnering aan klant: offerte staat klaar |
| `reminder_customer_request` | Herinnering aan klant: aanvraag openstaand |

**D. Uitbreiding check-pending-items**

De edge function krijgt extra logica:
1. Check `accommodation_quotes` met status `pending` ouder dan X dagen -> todo + optioneel e-mail naar partner
2. Check `accommodation_quotes` met `forwarded_at` gezet maar aanvraag nog niet `accepted` -> todo + optioneel e-mail naar klant
3. Check `program_requests` die lang inactief zijn -> todo

**E. Cron-job**

De bestaande cron-job (als die er is) wordt hergebruikt. Indien nog niet aanwezig, wordt een dagelijkse cron ingepland.

---

## Fase 3: Berichtenhistorie per project

### Bestaande implementatie

De `ProjectCommunicationsCard` en `project_communications` tabel zijn al aanwezig en functioneel. De automatische e-mails (via `email_log`) worden al gelogd.

### Verbetering

Bij het doorsturen van een offerte naar de klant wordt automatisch een `project_communication` aangemaakt met:
- Type: `email_out`
- Direction: `outbound`
- Subject en content van het verzonden bericht
- Contactnaam van de klant

Dit zorgt ervoor dat alle communicatie (handmatig en automatisch) zichtbaar is in de projecttijdlijn.

---

## Technische samenvatting

### Nieuwe bestanden
- `supabase/functions/create-quote-review-todo/index.ts` -- Auto-todo bij partnerofferte

### Gewijzigde bestanden
- `src/pages/PartnerAccommodation.tsx` -- Verwijder directe klantnotificatie, voeg todo-creatie toe
- `src/pages/PartnerDashboard.tsx` -- Idem
- `src/pages/admin/AdminAccommodationDetail.tsx` -- "Doorsturen naar klant" knop + dialoog
- `src/lib/autoTodoCreator.ts` -- Nieuwe types toevoegen
- `supabase/functions/check-pending-items/index.ts` -- Uitbreiden met logies-herinneringen
- `supabase/functions/notify-accommodation-quote/index.ts` -- Communicatie-log toevoegen

### Database-migratie
- `accommodation_quotes.forwarded_at` kolom toevoegen
- Nieuwe `app_settings` rijen voor herinnering-configuratie
- Nieuwe `email_templates` rijen voor herinneringsberichten
- Nieuwe auto-types in `autoTodoCreator`: `quote_review`, `quote_pending_partner`, `quote_pending_customer`, `request_no_response`
