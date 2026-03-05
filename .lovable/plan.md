

## Probleem

De knop "Logiesaanvraag maken" op de admin projectpagina stuurt de admin naar de publieke website (`/logies-aanvragen`). Dit heeft twee problemen:

1. De admin moet een publiek formulier invullen alsof zij een klant zijn
2. Het formulier vraagt om contactgegevens die al bekend zijn in het project
3. De aanvraag wordt ingediend "als klant" — inclusief bevestigingsmails naar de klant, wat ongewenst kan zijn bij maatwerk

## Oplossing

Een **admin-specifiek dialoog/sheet** bouwen op de projectpagina zelf, waarmee de admin direct een logiesaanvraag kan aanmaken zonder de admin-omgeving te verlaten. Klantgegevens worden automatisch overgenomen uit het project.

### Stappen

**1. Nieuw component: `AdminCreateAccommodationSheet.tsx`**
- Sheet/dialog binnen de admin UI
- Velden: aankomstdatum, vertrekdatum, aantal gasten, accommodatietype, kamerverdeling, bijzondere wensen
- Contactgegevens automatisch overgenomen uit het project (niet bewerkbaar)
- Submit knop maakt direct een `accommodation_request` record aan via Supabase, gekoppeld aan het project via `linked_program_id`
- Optioneel: verstuur notificatie-mails naar accommodatiepartners (of sla dit over voor maatwerk)

**2. Update `AdminRequestDetail.tsx`**
- Vervang de `<Link to={buildLogiesUrl()}>` door een knop die de nieuwe sheet opent
- Gegevens (datums, gasten, klantinfo) worden als props doorgegeven

**3. Database insert**
- Directe insert in `accommodation_requests` met `linked_program_id` = project ID
- Status: `submitted`
- Klantgegevens overgenomen uit `program_requests`
- Update `program_requests.linked_accommodation_id` met de nieuwe aanvraag-ID

**4. Optionele partner-notificatie**
- Na aanmaken: optie om `send-accommodation-request` edge function aan te roepen (of dit later handmatig te doen)

### Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/admin/AdminCreateAccommodationSheet.tsx` | Nieuw - formulier voor admin logiesaanvraag |
| `src/pages/admin/AdminRequestDetail.tsx` | Sheet openen i.p.v. navigeren naar publieke pagina |

