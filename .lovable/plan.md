

## Plan: Deduplicatie-check in checkout-formulier

### Wat het doet
Voor het versturen van een aanvraag wordt gecheckt of er al een `program_requests` record bestaat met hetzelfde e-mailadres en dezelfde datums, aangemaakt binnen de laatste 24 uur. Zo ja: toon een waarschuwingsdialoog waarin de klant kan kiezen om toch door te gaan of te annuleren.

### Aanpassingen

**`src/components/configurator/CheckoutContactForm.tsx`**:
- Bij form submit: voer eerst een Supabase query uit op `program_requests` waar `customer_email = formData.email` en `created_at > now() - 24h` en `selected_dates` overeenkomt
- Als er een match is: toon een bevestigingsdialoog ("U heeft al een aanvraag ingediend voor deze datums. Wilt u toch een nieuwe aanvraag versturen?")
- Bij "Toch versturen": ga door met de bestaande `handleSubmit` logica
- Bij "Annuleren": sluit de dialoog, geen submit
- Als er geen match is: submit direct zonder dialoog

**Geen database- of migratiewijzigingen nodig** — de bestaande `program_requests` tabel en RLS policies (anon SELECT op niet-verlopen requests) ondersteunen deze query al.

### Technische details

- Query: `supabase.from('program_requests').select('id, reference_number').eq('customer_email', email).gte('created_at', twentyFourHoursAgo).filter('selected_dates', 'eq', JSON.stringify(isoDates))`
- Fallback: als de query faalt (netwerk etc.), submit gewoon door — geen blokkering
- State: `duplicateWarningOpen` boolean + `existingRequest` object voor de dialoog
- Dialoog: gebruik bestaande `AlertDialog` component

