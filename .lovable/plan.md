

## Plan: Klant kan hotel contacteren vanuit het portaal

### Wat verandert er

Bij een gekozen logiesaccommodatie (State 2 in `AccommodationSection`) verschijnt een "Contact accommodatie" knop. Deze opent een dialog waarin de klant een bericht kan typen dat via e-mail wordt verstuurd naar het hotel. De communicatie wordt opgeslagen in de `project_communications` tabel.

---

### 1. Nieuwe edge function: `send-customer-accommodation-message`

Omdat klanten niet ingelogd zijn (ze werken met een `customer_token`), is er een nieuwe edge function nodig die:

- Het `customer_token` valideert tegen de `program_requests` tabel
- De bijbehorende accommodatie en gekozen quote ophaalt
- Het bericht verstuurt via Mailjet naar het e-mailadres van de partner
- Het bericht logt als `project_communication` (type `email_out`, direction `outbound`)
- Het bericht logt in de `email_log` tabel

**Input:** `{ customerToken, quoteId, subject, message }`

**Validatie:**
- Token moet geldig zijn en niet verlopen
- Quote moet status `selected` hebben en bij het programma horen
- Subject en message zijn verplicht

**E-mail:** Wordt verstuurd namens Bureau Vlieland (hallo@bureauvlieland.nl) met reply-to op het e-mailadres van de klant, zodat het hotel direct kan antwoorden.

**Bestand:** `supabase/functions/send-customer-accommodation-message/index.ts`

**Config:** `verify_jwt = false` in `supabase/config.toml` (klant is niet ingelogd)

---

### 2. Nieuwe component: `ContactAccommodationDialog`

Een dialog met:
- Onderwerp (vooringevuld met "Vraag over mijn verblijf - [naam accommodatie]")
- Berichtveld (textarea)
- Verzendknop
- Succesmelding na verzending

**Bestand:** `src/components/customer-portal/ContactAccommodationDialog.tsx`

---

### 3. Knop toevoegen in AccommodationSection (State 2)

In de "gekozen accommodatie" weergave komt naast de bevestigingsmelding een "Neem contact op" knop:

```
De accommodatie neemt contact met u op om de reservering definitief te maken.

[Mail icon] Neem contact op met [naam accommodatie]
```

De knop opent de `ContactAccommodationDialog`.

**Props nodig:** `customerToken` (al beschikbaar in parent) en `requestId` (van `accommodation.id`).

**Bestand:** `AccommodationSection.tsx`

---

### 4. Props doorvoeren

`AccommodationSection` heeft al `customerToken` als prop. De `accommodation.linked_program_id` en `accommodation.id` zijn ook al beschikbaar. Geen nieuwe props nodig in `DesktopProgramView` of `MobileProgramView`.

---

### Technische details

**Edge function flow:**

```text
Klant typt bericht
  -> POST /send-customer-accommodation-message
    -> Valideer customerToken (program_requests)
    -> Haal quote + partner op (accommodation_quotes + partners)
    -> Verstuur via Mailjet (From: Bureau Vlieland, Reply-To: klant email)
    -> Insert project_communications (request_id, accommodation_id)
    -> Insert email_log
    -> Return success
```

**RLS:** De `project_communications` insert gebeurt via de service role key in de edge function, dus geen RLS-wijzigingen nodig.

**E-mail template:** Eenvoudige gestylde e-mail met:
- Header: "Bureau Vlieland"
- Introductie: "[Klantnaam] heeft een vraag over de reservering voor [datums]"
- Het bericht van de klant
- Footer met contactgegevens klant (naam, e-mail, telefoon)

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/send-customer-accommodation-message/index.ts` | **Nieuw**: edge function voor klant-naar-hotel communicatie |
| `src/components/customer-portal/ContactAccommodationDialog.tsx` | **Nieuw**: dialog component |
| `src/components/customer-portal/AccommodationSection.tsx` | Knop toevoegen in State 2 (gekozen accommodatie) |

